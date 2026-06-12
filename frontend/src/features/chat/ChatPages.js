import { api } from "../../shared/utils/api.js";
import { escape, fmtTime, toast, timeAgo } from "../../shared/utils/helpers.js";
import { avatar, empty } from "../../shared/ui/components.js";
import { store } from "../../app/store.js";
import { ws } from "../../shared/utils/ws.js";
import { uploadFile } from "../../shared/utils/uploads.js";

function renderAttachment(att) {
  if (!att) return "";
  const safeUrl = escape(att.url);
  const safeName = escape(att.name || "file");
  if (att.type === "image") {
    return `<a href="${safeUrl}" target="_blank" rel="noopener"><img src="${safeUrl}" alt="${safeName}" style="max-width:240px;max-height:200px;border-radius:10px;display:block;margin-top:4px"/></a>`;
  }
  const icon = att.type === "video" ? "fa-film" : "fa-paperclip";
  const sizeKB = att.size ? Math.round(att.size / 1024) + " KB" : "";
  return `<a href="${safeUrl}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:.5rem;padding:.5rem .75rem;background:rgba(255,255,255,.15);border-radius:10px;color:inherit;margin-top:4px"><i class="fa-solid ${icon}"></i><span style="text-decoration:underline">${safeName}</span><span style="opacity:.7;font-size:.8rem">${sizeKB}</span></a>`;
}

export async function ChatPage({ mount, params }) {
  const me = store.getState().user;
  const activeId = params.id || null;
  mount.innerHTML = `
    <div class="container page">
      <h1 class="page-title">Chat <span class="badge badge-success" id="ws-status" style="vertical-align:middle;font-size:.7rem"><i class="fa-solid fa-circle" style="font-size:.5em"></i> Real-time</span></h1>
      <div class="chat-wrap mt-2">
        <aside class="conv-list">
          <div class="conv-search"><input class="input" id="conv-search" placeholder="Cari percakapan..." data-testid="conv-search"></div>
          <div class="conv-items" id="conv-items" data-testid="conv-items"></div>
        </aside>
        <section class="chat-room" id="chat-room">
          ${activeId ? '<div class="spinner"></div>' : `<div class="empty"><i class="fa-solid fa-comments"></i><h3>Pilih percakapan</h3><p>Pilih dari daftar untuk mulai chat</p></div>`}
        </section>
      </div>
    </div>`;

  // Ensure WS is connected
  ws.connect();
  if (activeId) ws.join(activeId);

  let convs = [];
  try {
    convs = await api.get("/conversations");
  } catch (e) {
    toast(e.message, "error");
    return;
  }

  const renderConvs = (filter = "") => {
    const c = document.getElementById("conv-items");
    if (!c) return;
    const list = convs.filter(
      (x) =>
        !filter ||
        (x.other?.name || "").toLowerCase().includes(filter.toLowerCase()),
    );
    if (!list.length) {
      c.innerHTML = empty(
        "Belum ada percakapan",
        "Mulai chat dari halaman jasa",
        "fa-comment",
      );
      return;
    }
    c.innerHTML = list
      .map(
        (x) => `
      <a class="conv-item ${activeId === x.id ? "active" : ""}" href="#/chat/${x.id}" data-testid="conv-${x.id}">
        ${avatar(x.other, "sm")}
        <div class="body">
          <div class="name"><span>${escape(x.other?.name || "")}</span>${x.unread ? `<span class="unread">${x.unread}</span>` : `<span class="text-xs text-muted">${timeAgo(x.updatedAt)}</span>`}</div>
          <div class="last">${escape(x.lastMessage || "Belum ada pesan")}</div>
        </div>
      </a>`,
      )
      .join("");
  };
  renderConvs();
  document
    .getElementById("conv-search")
    .addEventListener("input", (e) => renderConvs(e.target.value));

  if (!activeId) {
    // Still listen for incoming messages on list page to update preview
    const off = ws.on(async (data) => {
      if (data.type === "message") {
        try {
          convs = await api.get("/conversations");
          renderConvs(document.getElementById("conv-search").value);
        } catch (err) {
          if (import.meta.env.DEV)
            console.warn("[chat] refresh conversations failed", err);
        }
      }
    });
    return () => off();
  }

  const conv = convs.find((c) => c.id === activeId);
  if (!conv) {
    document.getElementById("chat-room").innerHTML = empty(
      "Percakapan tidak ditemukan",
    );
    return;
  }

  let messages = [];
  try {
    messages = await api.get(`/conversations/${activeId}/messages`);
  } catch (e) {
    document.getElementById("chat-room").innerHTML = empty(
      "Gagal memuat",
      e.message,
    );
    return;
  }

  const room = document.getElementById("chat-room");
  room.innerHTML = `
    <div class="chat-header">
      ${avatar(conv.other)}
      <div style="flex:1"><strong>${escape(conv.other?.name || "")}</strong><div class="text-xs text-muted" id="typing-ind">${escape(conv.other?.bio || "")}</div></div>
    </div>
    <div class="chat-messages" id="msgs" data-testid="msgs"></div>
    <form class="chat-input" id="msg-form">
      <input type="file" id="file-input" style="display:none" accept="image/*,video/*,application/pdf" data-testid="file-input">
      <button type="button" class="btn btn-ghost btn-sm" id="attach-btn" data-testid="attach-btn" title="Lampirkan file"><i class="fa-solid fa-paperclip"></i></button>
      <input class="input" id="msg-text" placeholder="Tulis pesan..." data-testid="msg-input" autocomplete="off">
      <button class="btn btn-primary" type="submit" data-testid="msg-send-btn"><i class="fa-solid fa-paper-plane"></i></button>
    </form>
    <div id="upload-preview" style="display:none;padding:.5rem 1rem;border-top:1px solid var(--border);font-size:.85rem"></div>`;

  const renderMsgs = () => {
    const m = document.getElementById("msgs");
    if (!m) return;
    m.innerHTML = messages
      .map((x) => {
        const senderId = x.senderId || x.fromUserId;
        const content = x.content || x.text || "";
        const att = x.attachment ? renderAttachment(x.attachment) : "";
        const text = content ? `<div>${escape(content)}</div>` : "";
        return `<div class="msg ${senderId === me.id ? "msg-mine" : "msg-other"}" data-testid="msg-bubble">${text}${att}<span class="time">${fmtTime(x.createdAt)}</span></div>`;
      })
      .join("");
    m.scrollTop = m.scrollHeight;
  };
  renderMsgs();

  let pendingAttachment = null;
  const fileInput = document.getElementById("file-input");
  const attachBtn = document.getElementById("attach-btn");
  const preview = document.getElementById("upload-preview");

  attachBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    preview.style.display = "block";
    preview.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Mengupload ${escape(f.name)}...`;
    try {
      pendingAttachment = await uploadFile(f, "chat");
      preview.innerHTML = `<i class="fa-solid fa-paperclip"></i> Siap dikirim: <strong>${escape(pendingAttachment.name)}</strong> <button type="button" class="btn btn-ghost btn-sm" id="att-clear">✕</button>`;
      document.getElementById("att-clear").addEventListener("click", () => {
        pendingAttachment = null;
        preview.style.display = "none";
        fileInput.value = "";
      });
    } catch (err) {
      toast(err.message, "error");
      preview.style.display = "none";
      pendingAttachment = null;
    }
  });

  // Typing indicator (debounced ws.send)
  const textInput = document.getElementById("msg-text");
  let typingTimer;
  textInput.addEventListener("input", () => {
    clearTimeout(typingTimer);
    ws.send({ type: "typing", conversationId: activeId });
    typingTimer = setTimeout(() => {}, 1500);
  });
  document.getElementById("msg-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = textInput.value.trim();
    if (!text && !pendingAttachment) {
      toast("Pesan tidak boleh kosong", "warning");
      return;
    }
    textInput.value = "";
    try {
      // Backend returns the created message directly (not wrapped)
      const r = await api.post(`/chat/conversations/${activeId}/messages`, {
        content: text,
        attachment: pendingAttachment,
      });
      messages.push(r.message || r);
      renderMsgs();
      pendingAttachment = null;
      preview.style.display = "none";
      fileInput.value = "";
    } catch (err) {
      toast(err.message, "error");
      textInput.value = text;
    }
  });

  // Real-time listener
  let typingHideTimer;
  const off = ws.on((data) => {
    if (data.type === "message" && data.conversationId === activeId) {
      messages.push(data.data);
      renderMsgs();
    } else if (data.type === "typing" && data.conversationId === activeId) {
      const ind = document.getElementById("typing-ind");
      if (ind) {
        ind.innerHTML = `<i class="fa-solid fa-pencil"></i> sedang mengetik...`;
        clearTimeout(typingHideTimer);
        typingHideTimer = setTimeout(() => {
          ind.innerHTML = escape(conv.other?.bio || "");
        }, 2500);
      }
    }
  });
  console.log(
    "Conversations with others:",
    convs.map((c) => ({
      id: c.id,
      otherName: c.other?.name,
      otherId: c.other?.id,
    })),
  );

  return () => off();
}

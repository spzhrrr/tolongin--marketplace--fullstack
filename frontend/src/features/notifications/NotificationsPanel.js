// frontend/src/features/notifications/NotificationsPanel.js
import { api } from "../../shared/utils/api.js";
import { timeAgo, escape, toast } from "../../shared/utils/helpers.js";
import { router } from "../../app/router.js";
import { store } from "../../app/store.js";

const POLL_MS = 30000;

let pollInterval = null;
let panelEl = null;
let outsideHandler = null;

function iconForType(type) {
  const map = {
    ORDER: "fa-receipt",
    PAYMENT: "fa-credit-card",
    MESSAGE: "fa-comment-dots",
    REVIEW: "fa-star",
    SYSTEM: "fa-circle-info",
    DISPUTE: "fa-scale-balanced",
    APPLICATION: "fa-paper-plane",
    WITHDRAWAL: "fa-money-bill-transfer",
    KYC: "fa-id-card",
  };
  return map[String(type || "").toUpperCase()] || "fa-bell";
}

export async function initNotifications(hostEl) {
  if (!hostEl || !store.getState().user) return;

  stopNotificationPolling();

  const bellBtn = hostEl.querySelector("#notif-btn");
  if (!bellBtn) return;

  if (!bellBtn.querySelector(".notif-badge")) {
    bellBtn.insertAdjacentHTML(
      "beforeend",
      `<span class="notif-badge" style="display:none;position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;padding:0 4px;background:var(--danger,#ef4444);color:#fff;border-radius:9px;font-size:.65rem;font-weight:700;align-items:center;justify-content:center;line-height:1">0</span>`,
    );
  }

  // Hapus event listener lama jika ada untuk mencegah duplikasi
  const newBellBtn = bellBtn.cloneNode(true);
  bellBtn.parentNode.replaceChild(newBellBtn, bellBtn);

  newBellBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    togglePanel(newBellBtn);
  });

  await refreshBadge();
  pollInterval = setInterval(refreshBadge, POLL_MS);
}

async function refreshBadge() {
  try {
    const list = await api.get("/notifications?unreadOnly=true");
    const items = Array.isArray(list) ? list : list?.data || [];
    setBadge(items.length);
  } catch (err) {
    if (import.meta.env.DEV) console.warn("[notif] poll gagal", err);
  }
}

function setBadge(count) {
  const badge = document.querySelector("#notif-btn .notif-badge");
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count > 99 ? "99+" : String(count);
    badge.style.display = "flex";
  } else {
    badge.style.display = "none";
  }
}

function closePanel() {
  if (panelEl) {
    panelEl.remove();
    panelEl = null;
  }
  if (outsideHandler) {
    document.removeEventListener("click", outsideHandler);
    outsideHandler = null;
  }
}

async function togglePanel(bellBtn) {
  if (panelEl) {
    closePanel();
    return;
  }

  const wrap = bellBtn.parentElement;
  if (getComputedStyle(wrap).position === "static") {
    wrap.style.position = "relative";
  }

  panelEl = document.createElement("div");
  panelEl.className = "notif-panel";
  panelEl.style.cssText = `position:absolute;top:calc(100% + 8px);right:0;width:360px;max-width:92vw;background:var(--surface,#fff);border:1px solid var(--border,#e5e7eb);border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.18);z-index:1200;overflow:hidden`;
  panelEl.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid var(--border,#e5e7eb)">
      <strong>Notifikasi</strong>
      <button class="btn btn-ghost btn-sm" id="notif-read-all" style="font-size:.75rem"><i class="fa-solid fa-check-double"></i> Tandai semua dibaca</button>
    </div>
    <div id="notif-list" style="max-height:60vh;overflow-y:auto">
      <div class="spinner" style="margin:24px auto"></div>
    </div>
    <div style="padding:10px 16px;border-top:1px solid var(--border,#e5e7eb);text-align:center">
      <a href="#/notifications" id="notif-see-all" style="font-size:.8rem;color:var(--primary,#0a66c2);text-decoration:none;font-weight:600">Lihat semua notifikasi</a>
    </div>`;

  bellBtn.parentElement.appendChild(panelEl);

  outsideHandler = (e) => {
    if (panelEl && !panelEl.contains(e.target) && !bellBtn.contains(e.target)) {
      closePanel();
    }
  };
  setTimeout(() => document.addEventListener("click", outsideHandler), 0);

  const readAllBtn = panelEl.querySelector("#notif-read-all");
  if (readAllBtn) {
    readAllBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      try {
        await api.patch("/notifications/read-all");
        toast("Semua notifikasi ditandai dibaca", "success");
        setBadge(0);
        await loadList();
      } catch (err) {
        toast(err.message || "Gagal menandai", "error");
      }
    });
  }

  const seeAllLink = panelEl.querySelector("#notif-see-all");
  if (seeAllLink) {
    seeAllLink.addEventListener("click", (e) => {
      e.preventDefault();
      closePanel();
      router.navigate("/notifications");
    });
  }

  await loadList();
}

async function loadList() {
  const listEl = panelEl?.querySelector("#notif-list");
  if (!listEl) return;

  try {
    const resp = await api.get("/notifications");
    const items = Array.isArray(resp) ? resp : resp?.data || [];

    if (!items.length) {
      listEl.innerHTML = `<div style="padding:32px 16px;text-align:center;color:var(--text-muted,#888)"><i class="fa-regular fa-bell-slash" style="font-size:1.5rem"></i><p style="margin:.5rem 0 0">Belum ada notifikasi</p></div>`;
      return;
    }

    listEl.innerHTML = items
      .map(
        (n) => `
        <div class="notif-item" data-id="${n.id}" data-url="${escape(n.actionUrl || "")}" style="display:flex;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border-light,#f1f1f1);cursor:pointer;transition:background 0.2s;${n.isRead ? "" : "background:var(--bg-light,#f5f8ff)"}">
          <div style="flex:none;width:34px;height:34px;border-radius:50%;background:var(--bg-light,#eef2f7);display:flex;align-items:center;justify-content:center;color:var(--primary,#0a66c2)">
            <i class="fa-solid ${iconForType(n.type)}"></i>
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:.88rem">${escape(n.title || "")}</div>
            <div style="font-size:.8rem;color:var(--text-secondary,#555);margin-top:2px;word-break:break-word">${escape(n.body || "")}</div>
            <div style="font-size:.72rem;color:var(--text-muted,#999);margin-top:4px">${timeAgo(n.createdAt)}</div>
          </div>
          ${n.isRead ? "" : '<div style="flex:none;width:8px;height:8px;border-radius:50%;background:var(--primary,#0a66c2);margin-top:6px"></div>'}
        </div>`,
      )
      .join("");

    // Event delegation untuk performa yang lebih baik
    listEl.querySelectorAll(".notif-item").forEach((item) => {
      item.addEventListener("click", async (event) => {
        // Stop propagation agar tidak memicu event lain
        event.stopPropagation();

        const id = item.dataset.id;
        let url = item.dataset.url;

        if (!id) return;

        // Mark as read
        try {
          await api.patch(`/notifications/${id}/read`);
        } catch (err) {
          if (import.meta.env.DEV) console.warn("[notif] mark read gagal", err);
        }

        // Refresh badge count
        await refreshBadge();

        // Close panel
        closePanel();

        // Navigate jika ada URL
        if (url && url.trim()) {
          // Pastikan URL valid
          let navUrl = url.trim();
          if (!navUrl.startsWith("/")) {
            navUrl = `/${navUrl}`;
          }

          // Hapus hash jika ada karena router menggunakan hash-based routing
          if (navUrl.startsWith("#")) {
            navUrl = navUrl.substring(1);
          }

          if (import.meta.env.DEV) {
            console.log("[notif] Navigating to:", navUrl);
          }

          // Gunakan router untuk navigasi
          router.navigate(navUrl);
        }
      });

      // Tambahkan hover effect
      item.style.transition = "background 0.2s";
      item.addEventListener("mouseenter", () => {
        item.style.background = "var(--bg-hover, #f9fafb)";
      });
      item.addEventListener("mouseleave", () => {
        if (!item.dataset.read && item.style.background) {
          item.style.background = "";
        }
      });
    });
  } catch (err) {
    console.error("[notif] Gagal memuat notifikasi:", err);
    listEl.innerHTML = `<div style="padding:24px 16px;text-align:center;color:var(--text-muted,#888)"><i class="fa-solid fa-circle-exclamation"></i><p style="margin:.5rem 0 0">Gagal memuat notifikasi</p><button id="notif-retry" class="btn btn-sm btn-primary" style="margin-top:12px">Coba lagi</button></div>`;

    const retryBtn = listEl.querySelector("#notif-retry");
    if (retryBtn) {
      retryBtn.addEventListener("click", () => {
        loadList();
      });
    }
  }
}

export function stopNotificationPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  closePanel();
}

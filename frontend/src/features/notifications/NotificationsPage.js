import { api } from "../../shared/utils/api.js";
import { escape, timeAgo, toast } from "../../shared/utils/helpers.js";
import { router } from "../../app/router.js";
import { store } from "../../app/store.js";

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

export async function NotificationsPage({ mount }) {
  const user = store.getState().user;
  if (!user) {
    router.navigate("/login");
    return;
  }

  mount.innerHTML = `
    <div class="container page" style="max-width:1000px; margin:0 auto; padding:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:24px;">
        <div>
          <h1 class="page-title" style="margin:0; font-size:1.8rem;"><i class="fa-regular fa-bell" style="margin-right:12px;"></i> Notifikasi</h1>
          <p class="page-subtitle" style="margin:4px 0 0; color:#666;">Semua aktivitas dan update terbaru Anda</p>
        </div>
        <button class="btn btn-secondary btn-sm" id="page-read-all" style="padding:10px 20px; border-radius:30px; background:#f0f0f0; border:none; cursor:pointer;">
          <i class="fa-solid fa-check-double"></i> Tandai semua dibaca
        </button>
      </div>
      
      <div id="notif-list" class="flex-col" style="display:flex; flex-direction:column; gap:12px;">
        <div class="spinner" style="text-align:center; padding:40px;"></div>
      </div>
    </div>
  `;

  const listEl = mount.querySelector("#notif-list");

  const render = async () => {
    try {
      const resp = await api.get("/notifications");
      const items = Array.isArray(resp) ? resp : resp?.data || [];

      if (!items.length) {
        listEl.innerHTML = `
          <div class="empty" style="text-align:center; padding:60px 20px; background:#fafafa; border-radius:20px;">
            <i class="fa-regular fa-bell-slash" style="font-size:3rem; color:#ccc;"></i>
            <h3 style="margin:12px 0 8px;">Belum ada notifikasi</h3>
            <p style="color:#999;">Notifikasi akan muncul di sini saat ada aktivitas</p>
            <a href="#/marketplace" class="btn btn-primary" style="display:inline-block; margin-top:16px; padding:10px 24px; background:#0a66c2; color:#fff; border-radius:30px; text-decoration:none;">Jelajahi Marketplace</a>
          </div>
        `;
        return;
      }

      listEl.innerHTML = items
        .map(
          (n) => `
        <div class="notif-card" data-id="${n.id}" data-url="${escape(n.actionUrl || "")}" style="display:flex; gap:16px; padding:16px 20px; background:${n.isRead ? "#fff" : "#f0f7ff"}; border-radius:16px; cursor:pointer; transition:all 0.2s; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
          <div style="flex:none; width:48px; height:48px; border-radius:50%; background:${n.isRead ? "#eef2f7" : "#0a66c2"}; display:flex; align-items:center; justify-content:center; color:${n.isRead ? "#0a66c2" : "#fff"};">
            <i class="fa-solid ${iconForType(n.type)}" style="font-size:1.2rem;"></i>
          </div>
          <div style="flex:1; min-width:0;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
              <div style="font-weight:600; font-size:1rem;">${escape(n.title || "")}</div>
              <div style="font-size:0.7rem; color:#999; white-space:nowrap;">${timeAgo(n.createdAt)}</div>
            </div>
            <div style="font-size:0.85rem; color:#555; margin-top:4px; line-height:1.5;">${escape(n.body || "")}</div>
            ${!n.isRead ? '<span class="badge badge-info" style="display:inline-block; margin-top:8px; background:#0a66c2; color:#fff; padding:2px 10px; border-radius:20px; font-size:0.7rem;">Baru</span>' : ""}
          </div>
          <div style="flex:none;">
            <i class="fa-solid fa-chevron-right" style="color:#ccc;"></i>
          </div>
        </div>
      `,
        )
        .join("");

      // Add hover effect
      document.querySelectorAll(".notif-card").forEach((card) => {
        card.addEventListener("mouseenter", () => {
          card.style.transform = "translateX(4px)";
          card.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
        });
        card.addEventListener("mouseleave", () => {
          card.style.transform = "translateX(0)";
          card.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
        });
      });

      // Click handler
      listEl.querySelectorAll(".notif-card").forEach((card) => {
        card.addEventListener("click", async () => {
          const id = card.dataset.id;
          const url = card.dataset.url;
          try {
            await api.patch(`/notifications/${id}/read`);
          } catch (err) {
            if (import.meta.env.DEV)
              console.warn("[notif] mark read gagal", err);
          }
          if (url) {
            router.navigate(url.startsWith("/") ? url : `/${url}`);
          } else {
            render();
          }
        });
      });
    } catch (err) {
      listEl.innerHTML = `<div class="empty"><h3>Gagal memuat notifikasi</h3><p>${escape(err.message || "")}</p></div>`;
    }
  };

  mount.querySelector("#page-read-all")?.addEventListener("click", async () => {
    try {
      await api.patch("/notifications/read-all");
      toast("✅ Semua notifikasi ditandai dibaca", "success");
      render();
    } catch (err) {
      toast(err.message || "Gagal menandai", "error");
    }
  });

  render();
}

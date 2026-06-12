// frontend/src/features/marketplace/MarketplacePages.js

import { api } from "../../shared/utils/api.js";
import {
  debounce,
  toast,
  escape,
  fmtIDR,
  timeAgo,
} from "../../shared/utils/helpers.js";
import { store } from "../../app/store.js";
import { router } from "../../app/router.js";

// ✅ Definisikan serviceCard secara lokal
function serviceCard(s, options = {}) {
  const rating = s.rating || 0;
  const reviewCount = s.reviewCount || 0;
  const imageUrl =
    s.image ||
    (s.images && s.images[0]) ||
    "https://placehold.co/400x300/0a66c2/ffffff?text=No+Image";
  const isFav = options.favorited || false;

  return `
    <div class="service-card" data-service-id="${s.id}" style="background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.1); cursor:pointer;">
      <div class="service-image" style="height:160px; overflow:hidden;">
        <img src="${imageUrl}" alt="${escape(s.title)}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://placehold.co/400x300/0a66c2/ffffff?text=No+Image'">
      </div>
      <div class="service-content" style="padding:12px;">
        <div class="seller-name" style="font-size:12px; color:#666; margin-bottom:4px;">${escape(s.seller?.name || "Freelancer")}</div>
        <div class="title" style="font-weight:600; margin-bottom:8px;">${escape(s.title)}</div>
        <div class="rating" style="font-size:12px; color:#f5b042; margin-bottom:8px;">
          ${"★".repeat(Math.floor(rating))}${"☆".repeat(5 - Math.floor(rating))} (${reviewCount})
        </div>
        <div class="price" style="font-weight:700; color:#0a66c2;">${fmtIDR(s.price)}</div>
        ${isFav ? '<span class="badge" style="position:absolute; top:8px; right:8px;">❤️</span>' : ""}
      </div>
    </div>
  `;
}

export async function MarketplacePage({ mount, query }) {
  const u = store.getState().user;

  mount.innerHTML = `
    <div class="container page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Cari Jasa</h1>
          <p class="page-subtitle">Temukan jasa terbaik dari freelancer profesional</p>
        </div>
        ${
          u && u.role !== "ADMIN"
            ? `
          <a href="#/post-service" class="btn btn-primary" id="post-service-btn" data-testid="post-service-btn" style="display:flex; align-items:center; gap:8px;">
            <i class="fa-solid fa-plus"></i> Posting Jasa
          </a>
        `
            : ""
        }
      </div>
      <div class="filters" data-testid="filters-bar" style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between;">
        <div class="input-icon" style="flex: 1; min-width: 200px; max-width: 300px;">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input class="input" id="q" placeholder="Cari jasa..." value="${escape(query.q || "")}" data-testid="search-input" style="padding-left: 2.5rem; width: 100%;">
        </div>
        <select class="select" id="cat" data-testid="filter-category" style="width: 150px;">
          <option value="all">Semua Kategori</option>
        </select>
        <div class="price-filter" style="display: flex; align-items: center; gap: 8px;">
          <input class="input" id="min" type="number" placeholder="Min Rp" style="width: 100px;">
          <span class="text-muted">—</span>
          <input class="input" id="max" type="number" placeholder="Max Rp" style="width: 100px;">
        </div>
        <select class="select" id="min-rating" data-testid="filter-rating" style="width: 140px;">
          <option value="">Semua Rating</option>
          <option value="4.5">4.5★ ke atas</option>
          <option value="4">4★ ke atas</option>
          <option value="3">3★ ke atas</option>
        </select>
        <select class="select" id="delivery" data-testid="filter-delivery" style="width: 150px;">
          <option value="">Semua Pengerjaan</option>
          <option value="1">≤ 1 hari</option>
          <option value="3">≤ 3 hari</option>
          <option value="7">≤ 7 hari</option>
          <option value="14">≤ 14 hari</option>
        </select>
        <select class="select" id="sort-by" data-testid="filter-sort" style="width: 160px;">
          <option value="newest">Terbaru</option>
          <option value="rating_desc">Rating Tertinggi</option>
          <option value="price_asc">Harga Terendah</option>
          <option value="price_desc">Harga Tertinggi</option>
        </select>
        <button class="btn btn-secondary btn-sm" id="reset-filters" style="white-space: nowrap; padding: 8px 16px;">
          <i class="fa-solid fa-rotate-left"></i> Reset
        </button>
        <div id="results-count" class="text-sm text-muted" style="margin-left: auto; white-space: nowrap;"></div>
      </div>
      <div id="results" class="services-grid" data-testid="services-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; margin-top: 24px;"></div>
    </div>`;

  const postServiceBtn = document.getElementById("post-service-btn");
  if (postServiceBtn) {
    postServiceBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (!store.getState().user) {
        toast("Silakan login dulu", "warning");
        return router.navigate("/login");
      }
      router.navigate("/post-service");
    });
  }

  const cats = await api.get("/categories");
  const sel = document.getElementById("cat");
  if (sel) {
    sel.innerHTML =
      `<option value="all">Semua Kategori</option>` +
      cats.map((c) => `<option value="${c.slug}">${c.name}</option>`).join("");
  }

  let favs = [];
  try {
    if (store.getState().token) {
      const favResponse = await api.get("/favorites");
      favs = favResponse.map((s) => s.id);
    }
  } catch (err) {
    console.warn("[marketplace] favorites load failed", err);
  }

  const load = async () => {
    const params = new URLSearchParams();
    params.set("limit", "100");
    const q = document.getElementById("q")?.value.trim() || "";
    const cat = document.getElementById("cat")?.value || "all";
    const min = document.getElementById("min")?.value || "";
    const max = document.getElementById("max")?.value || "";
    if (q) params.set("q", q);
    if (cat && cat !== "all") {
      const c = cats.find((x) => x.slug === cat);
      if (c) params.set("categoryId", c.id);
    }
    if (min) params.set("minPrice", min);
    if (max) params.set("maxPrice", max);
    const minRating = document.getElementById("min-rating")?.value || "";
    const delivery = document.getElementById("delivery")?.value || "";
    const sortBy = document.getElementById("sort-by")?.value || "";
    if (minRating) params.set("minRating", minRating);
    if (delivery) params.set("maxDeliveryDays", delivery);
    if (sortBy) params.set("sortBy", sortBy);

    const res = document.getElementById("results");
    if (!res) return;
    res.innerHTML =
      '<div class="spinner" style="grid-column:1/-1; text-align:center; padding:40px;"></div>';

    try {
      const resp = await api.get("/services?" + params.toString());
      const items = Array.isArray(resp) ? resp : resp.data || [];
      if (!items.length) {
        res.innerHTML = `<div class="empty" style="grid-column:1/-1; text-align:center; padding:40px;">
          <i class="fa-solid fa-search"></i>
          <h3>Tidak ada hasil</h3>
          <p>Coba kata kunci lain atau ubah filter</p>
        </div>`;
        const countEl = document.getElementById("results-count");
        if (countEl) countEl.textContent = `0 jasa ditemukan`;
        return;
      }

      res.innerHTML = items
        .map((s) => {
          const rating = s.rating || 0;
          const reviewCount = s.reviewCount || 0;
          const imageUrl =
            s.image ||
            (s.images && s.images[0]) ||
            "https://placehold.co/400x300/0a66c2/ffffff?text=No+Image";
          const isFav = favs.includes(s.id);

          return `
          <div class="service-card" data-service-id="${s.id}" style="background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.1); cursor:pointer;">
            <div class="service-image" style="height:160px; overflow:hidden;">
              <img src="${imageUrl}" alt="${escape(s.title)}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://placehold.co/400x300/0a66c2/ffffff?text=No+Image'">
            </div>
            <div class="service-content" style="padding:12px; position:relative;">
              <div class="seller-link" data-user-id="${s.sellerId}" style="cursor:pointer; font-size:12px; color:#0a66c2; margin-bottom:4px;">
                ${escape(s.seller?.name || "Freelancer")}
                ${s.seller?.verified ? '<i class="fa-solid fa-circle-check" style="color:#0a66c2; font-size:10px;"></i>' : ""}
              </div>
              <div class="title" style="font-weight:600; margin-bottom:8px;">${escape(s.title)}</div>
              <div class="rating" style="font-size:12px; color:#f5b042; margin-bottom:8px;">
                ${"★".repeat(Math.floor(rating))}${"☆".repeat(5 - Math.floor(rating))} (${reviewCount})
              </div>
              <div class="delivery" style="font-size:11px; color:#999; margin-bottom:8px;">
                <i class="fa-regular fa-clock"></i> ${s.deliveryTime || "Fleksibel"} hari
              </div>
              <div class="price" style="font-weight:700; color:#0a66c2; font-size:1.1rem;">${fmtIDR(s.price)}</div>
              <button class="btn-fav" data-fav="${s.id}" style="position:absolute; top:8px; right:8px; background:white; border:none; border-radius:50%; width:32px; height:32px; cursor:pointer; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                <i class="fa-${isFav ? "solid" : "regular"} fa-heart" style="color:${isFav ? "#dc3545" : "#999"};"></i>
              </button>
            </div>
          </div>
        `;
        })
        .join("");

      const countEl = document.getElementById("results-count");
      if (countEl) countEl.textContent = `${items.length} jasa ditemukan`;

      res.querySelectorAll(".service-card").forEach((card) => {
        card.addEventListener("click", (e) => {
          if (e.target.closest(".seller-link") || e.target.closest(".btn-fav"))
            return;
          const serviceId = card.dataset.serviceId;
          if (serviceId) router.navigate("/services/" + serviceId);
        });
      });

      res.querySelectorAll(".seller-link").forEach((el) =>
        el.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const uid = el.dataset.userId;
          if (uid) router.navigate("/users/" + uid);
        }),
      );

      res.querySelectorAll(".btn-fav").forEach((btn) =>
        btn.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!store.getState().token) {
            toast("Login dulu untuk menyimpan favorit", "warning");
            return;
          }
          const serviceId = btn.dataset.fav;
          const icon = btn.querySelector("i");
          const isCurrentlyFavorited = icon.classList.contains("fa-solid");
          btn.disabled = true;
          btn.style.opacity = "0.6";
          try {
            const response = await api.post("/favorites/" + serviceId);
            let newStatus = !isCurrentlyFavorited;
            if (response.favorited !== undefined)
              newStatus = response.favorited;
            else if (response.message?.toLowerCase().includes("added"))
              newStatus = true;
            else if (response.message?.toLowerCase().includes("removed"))
              newStatus = false;

            if (newStatus) {
              icon.classList.remove("fa-regular");
              icon.classList.add("fa-solid");
              icon.style.color = "#dc3545";
              if (!favs.includes(serviceId)) favs.push(serviceId);
              toast("❤️ Ditambahkan ke favorit", "success");
            } else {
              icon.classList.remove("fa-solid");
              icon.classList.add("fa-regular");
              icon.style.color = "#999";
              const idx = favs.indexOf(serviceId);
              if (idx > -1) favs.splice(idx, 1);
              toast("💔 Dihapus dari favorit", "success");
            }
          } catch (err) {
            toast(err.message || "Gagal mengubah favorit", "error");
          } finally {
            btn.disabled = false;
            btn.style.opacity = "";
          }
        }),
      );
    } catch (err) {
      console.error("Load error:", err);
      res.innerHTML = `<div class="empty" style="grid-column:1/-1; text-align:center; padding:40px;">
        <i class="fa-solid fa-circle-exclamation"></i>
        <h3>Gagal memuat</h3>
        <p>${escape(err.message)}</p>
        <button class="btn btn-primary mt-2" onclick="location.reload()">Coba Lagi</button>
      </div>`;
    }
  };

  const d = debounce(load, 300);
  ["q", "min", "max"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", d);
  });
  ["cat", "min-rating", "delivery", "sort-by"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", load);
  });
  document.getElementById("reset-filters")?.addEventListener("click", () => {
    const q = document.getElementById("q");
    if (q) q.value = "";
    const cat = document.getElementById("cat");
    if (cat) cat.value = "all";
    ["min", "max"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    const minRating = document.getElementById("min-rating");
    if (minRating) minRating.value = "";
    const delivery = document.getElementById("delivery");
    if (delivery) delivery.value = "";
    const sortBy = document.getElementById("sort-by");
    if (sortBy) sortBy.value = "newest";
    load();
  });
  load();
}

// frontend/src/features/marketplace/MarketplacePages.js

// Ganti fungsi ServiceDetailPage dengan ini:

export async function ServiceDetailPage({ mount, params }) {
  mount.innerHTML = `<div class="container page"><div class="spinner" style="text-align:center; padding:40px;"></div></div>`;

  try {
    const s = await api.get("/services/" + params.id);
    const u = store.getState().user;
    const isOwner = u && s.sellerId === u.id;
    const deliveryTime = s.deliveryTime
      ? `${s.deliveryTime} hari pengerjaan`
      : "Fleksibel";
    const rating = s.rating || 0;
    const reviewCount = s.reviewCount || 0;
    const imageUrl =
      s.image ||
      (s.images && s.images[0]) ||
      "https://placehold.co/600x800/0a66c2/ffffff?text=No+Image";

    mount.innerHTML = `
      <div class="container page" style="max-width:1200px; margin:0 auto; padding:20px;">
        <a href="#/marketplace" class="text-sm" data-testid="back-marketplace" style="display:inline-block; margin-bottom:20px; text-decoration:none; color:#0a66c2;">
          <i class="fa-solid fa-arrow-left"></i> Kembali ke Cari Jasa
        </a>
        
        <div style="display:flex; gap:24px; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          
          <!-- KOLOM KIRI: GAMBAR VERTIKAL -->
          <div style="flex: 0.8; min-width:0; background:#f5f5f5;">
            <img src="${imageUrl}" 
                 alt="${escape(s.title)}" 
                 style="width:100%; height:100%; min-height:500px; object-fit:cover; display:block;"
                 onerror="this.src='https://placehold.co/600x800/0a66c2/ffffff?text=No+Image'" />
          </div>
          
          <!-- KOLOM KANAN: KONTEN -->
          <div style="flex: 1.2; padding:24px; display:flex; flex-direction:column;">
            
            <span class="badge" style="display:inline-block; background:#e8f0fe; color:#0a66c2; padding:4px 12px; border-radius:20px; font-size:12px; width:fit-content; margin-bottom:16px;">
              ${escape(s.category?.name || s.category || "Umum")}
            </span>
            
            <h1 style="margin:0 0 12px 0; font-size:1.8rem; line-height:1.3;">${escape(s.title)}</h1>
            
            <div style="display:flex; flex-wrap:wrap; gap:20px; margin-bottom:24px; padding-bottom:16px; border-bottom:1px solid #eee;">
              <span style="display:flex; align-items:center; gap:6px; font-size:14px;">
                <i class="fa-solid fa-star" style="color:#f5b042;"></i>
                <strong>${rating.toFixed(1)}</strong>
                <span style="color:#666;">(${reviewCount} ulasan)</span>
              </span>
              <span style="display:flex; align-items:center; gap:6px; font-size:14px; color:#666;">
                <i class="fa-solid fa-location-dot"></i> ${escape(s.city || "Remote")}
              </span>
              <span style="display:flex; align-items:center; gap:6px; font-size:14px; color:#666;">
                <i class="fa-solid fa-clock"></i> ${escape(deliveryTime)}
              </span>
            </div>
            
            <div style="margin-bottom:24px;">
              <h3 style="font-size:1rem; margin:0 0 12px 0; color:#333;">Deskripsi</h3>
              <p style="font-size:0.95rem; line-height:1.6; color:#555; margin:0;">${escape(s.description || "Tidak ada deskripsi")}</p>
            </div>
            
            <div style="background:#f8f9fa; border-radius:12px; padding:16px; margin-bottom:24px;">
              <h3 style="font-size:0.8rem; margin:0 0 12px 0; color:#666;">TENTANG PENJUAL</h3>
              <div class="seller-link" data-user-id="${s.sellerId}" style="cursor:pointer; display:flex; align-items:center; gap:12px;">
                <img src="${s.seller?.avatar || "https://i.pravatar.cc/48"}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;">
                <div>
                  <div style="font-weight:700; display:flex; align-items:center; gap:6px;">
                    ${escape(s.seller?.name || "Penjual")}
                    ${s.seller?.verified ? '<i class="fa-solid fa-circle-check" style="color:#0a66c2; font-size:14px;"></i>' : ""}
                  </div>
                  <div style="font-size:0.8rem; color:#666;">⭐ ${(s.seller?.rating || 0).toFixed(1)} (${s.seller?.reviewCount || 0} ulasan)</div>
                </div>
              </div>
            </div>
            
            <div style="background:linear-gradient(135deg, #0a66c2 0%, #004182 100%); border-radius:12px; padding:20px; margin-bottom:16px; color:#fff;">
              <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px;">
                <div>
                  <div style="font-size:12px; opacity:0.8;">Mulai dari harga ini</div>
                  <div style="font-size:2rem; font-weight:700;">${fmtIDR(s.price || 0)}</div>
                </div>
                ${
                  !isOwner && u
                    ? `
                  <div style="display:flex; gap:12px;">
                    <button class="order-btn" id="order-btn" style="background:#fff; color:#0a66c2; border:none; padding:10px 20px; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer;">
                      <i class="fa-solid fa-bag-shopping"></i> Pesan
                    </button>
                    <button class="chat-btn" id="chat-btn" style="background:transparent; color:#fff; border:1px solid #fff; padding:10px 20px; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer;">
                      <i class="fa-solid fa-comment"></i> Chat
                    </button>
                  </div>
                `
                    : isOwner
                      ? `
                  <div style="background:rgba(255,255,255,0.2); padding:10px 20px; border-radius:8px;">Jasa Anda</div>
                `
                      : `
                  <a href="#/login" style="background:#fff; color:#0a66c2; text-decoration:none; padding:10px 20px; border-radius:8px; font-size:14px; font-weight:600;">
                    Login
                  </a>
                `
                }
              </div>
            </div>
            
            <div style="text-align:center; font-size:11px; color:#999;">
              <i class="fa-solid fa-shield-halved"></i> Pembayaran aman dengan escrow protection
            </div>
            
            <div style="margin-top:24px;">
              <h3 style="font-size:1rem; margin:0 0 16px 0;">Ulasan (${reviewCount})</h3>
              <div id="reviews-list" style="max-height:300px; overflow-y:auto;"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Load reviews
    try {
      const reviewsRes = await api.get(`/reviews/service/${s.id}`);
      const reviews = Array.isArray(reviewsRes)
        ? reviewsRes
        : reviewsRes?.data || [];
      const reviewsList = document.getElementById("reviews-list");
      if (reviews && reviews.length > 0) {
        reviewsList.innerHTML = reviews
          .map(
            (r) => `
          <div style="padding:12px 0; border-bottom:1px solid #eee;">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
              <img src="${r.reviewer?.avatar || r.buyerAvatar || "https://i.pravatar.cc/32"}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">
              <div>
                <div style="font-weight:600; font-size:0.85rem;">${escape(r.reviewer?.name || r.buyerName || "User")}</div>
                <div style="font-size:0.7rem; color:#f5b042;">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</div>
              </div>
              <div style="font-size:0.7rem; color:#999; margin-left:auto;">${timeAgo(r.createdAt)}</div>
            </div>
            <p style="font-size:0.85rem; color:#555; margin:0;">${escape(r.comment || "")}</p>
          </div>
        `,
          )
          .join("");
      } else {
        reviewsList.innerHTML =
          '<div style="text-align:center; padding:30px; color:#999;">Belum ada ulasan</div>';
      }
    } catch (e) {
      const reviewsList = document.getElementById("reviews-list");
      if (reviewsList)
        reviewsList.innerHTML =
          '<div style="text-align:center; padding:30px; color:#999;">Belum ada ulasan</div>';
    }

    // Seller link click
    const sellerLink = document.querySelector(".seller-link");
    if (sellerLink) {
      sellerLink.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        router.navigate("/users/" + s.sellerId);
      });
    }

    // ✅ ORDER BUTTON - LENGKAP DENGAN KONFIRMASI
    const orderBtn = document.getElementById("order-btn");
    if (orderBtn) {
      orderBtn.addEventListener("click", async () => {
        if (!u) {
          toast("Silakan login dulu", "warning");
          return router.navigate("/login");
        }

        // Cek verifikasi
        try {
          const me = await api.get("/auth/me");
          if (!me.emailVerified || !me.phoneVerified) {
            toast(
              "Verifikasi email & nomor telepon dulu sebelum memesan",
              "warning",
              6000,
            );
            return router.navigate("/verification");
          }
        } catch (_) {}

        const fee = Math.round((s.price || 0) * 0.05);
        const total = (s.price || 0) + fee;

        // Buat modal overlay
        const overlay = document.createElement("div");
        overlay.className = "modal-backdrop";
        overlay.style.cssText =
          "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;";
        overlay.innerHTML = `
          <div style="background:white;border-radius:12px;max-width:500px;width:90%;">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:16px;border-bottom:1px solid #eee;">
              <h3 style="margin:0;">Konfirmasi Pesanan</h3>
              <button id="mc-close" style="background:none;border:none;font-size:24px;cursor:pointer;">✕</button>
            </div>
            <div style="padding:16px;">
              <div style="background:#f5f5f5;border-radius:10px;padding:1rem;margin-bottom:1rem">
                <strong>${escape(s.title)}</strong>
                <div class="text-muted text-sm">oleh ${escape(s.seller?.name || "Penjual")}</div>
              </div>
              <textarea id="order-notes" rows="3" placeholder="Catatan untuk penjual (opsional)" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;"></textarea>
              <div style="margin-top:16px;background:#f5f5f5;border-radius:10px;padding:1rem">
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                  <span>Harga Jasa</span>
                  <span>${fmtIDR(s.price)}</span>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                  <span>Biaya Layanan (5%)</span>
                  <span>${fmtIDR(fee)}</span>
                </div>
                <div style="border-top:1px solid #ddd;margin:8px 0;"></div>
                <div style="display:flex;justify-content:space-between;">
                  <strong>Total</strong>
                  <strong style="color:#0a66c2;">${fmtIDR(total)}</strong>
                </div>
              </div>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:12px;padding:16px;border-top:1px solid #eee;">
              <button id="mc-cancel" style="padding:8px 16px;background:#f0f0f0;border:none;border-radius:8px;cursor:pointer;">Batal</button>
              <button id="mc-confirm" style="padding:8px 16px;background:#0a66c2;color:#fff;border:none;border-radius:8px;cursor:pointer;">
                <i class="fa-solid fa-credit-card"></i> Lanjutkan
              </button>
            </div>
          </div>`;
        document.body.appendChild(overlay);

        const closeModal = () => overlay.remove();
        overlay
          .querySelector("#mc-close")
          .addEventListener("click", closeModal);
        overlay
          .querySelector("#mc-cancel")
          .addEventListener("click", closeModal);
        overlay.addEventListener("click", (e) => {
          if (e.target === overlay) closeModal();
        });

        overlay
          .querySelector("#mc-confirm")
          .addEventListener("click", async () => {
            const note = document.getElementById("order-notes")?.value || "";
            const confirmBtn = overlay.querySelector("#mc-confirm");
            confirmBtn.disabled = true;
            confirmBtn.innerHTML =
              '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...';
            try {
              const order = await api.post("/orders", {
                serviceId: s.id,
                note,
              });
              closeModal();
              toast("Pesanan dibuat! Silakan bayar.", "success");
              router.navigate("/orders/" + order.id);
            } catch (err) {
              toast(err.message, "error");
              confirmBtn.disabled = false;
              confirmBtn.innerHTML =
                '<i class="fa-solid fa-credit-card"></i> Lanjutkan';
            }
          });
      });
    }

    // ✅ CHAT BUTTON - LENGKAP
    const chatBtn = document.getElementById("chat-btn");
    if (chatBtn) {
      chatBtn.addEventListener("click", async () => {
        if (!u) {
          toast("Silakan login dulu", "warning");
          return router.navigate("/login");
        }
        if (u.id === s.sellerId) {
          toast("Anda tidak bisa chat dengan diri sendiri", "warning");
          return;
        }

        chatBtn.disabled = true;
        chatBtn.innerHTML =
          '<i class="fa-solid fa-spinner fa-spin"></i> Memuat...';

        try {
          const response = await api.post("/chat/conversations", {
            recipientId: s.sellerId,
          });
          let conversationId = null;
          if (response && response.id) conversationId = response.id;
          else if (
            response &&
            response.conversation &&
            response.conversation.id
          )
            conversationId = response.conversation.id;

          if (conversationId) {
            toast("Membuka chat...", "info", 1000);
            router.navigate("/chat/" + conversationId);
          } else {
            toast("Gagal memulai chat", "error");
          }
        } catch (err) {
          console.error("Chat error:", err);
          toast(err.message || "Gagal memulai chat", "error");
        } finally {
          chatBtn.disabled = false;
          chatBtn.innerHTML =
            '<i class="fa-solid fa-comment"></i> Chat Penjual';
        }
      });
    }
  } catch (err) {
    console.error("Detail error:", err);
    mount.innerHTML = `<div class="container"><div class="empty" style="text-align:center; padding:40px;">
      <i class="fa-solid fa-circle-exclamation"></i>
      <h3>Jasa tidak ditemukan</h3>
      <p>${escape(err.message)}</p>
      <a href="#/marketplace" class="btn btn-primary mt-2">Kembali ke Cari Jasa</a>
    </div></div>`;
  }
}

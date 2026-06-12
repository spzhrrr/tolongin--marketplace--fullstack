// frontend/src/features/profile/PublicProfilePage.js

import { api } from "../../shared/utils/api.js";
import { escape, fmtIDR, toast, timeAgo } from "../../shared/utils/helpers.js";
import { avatar, serviceCard, empty } from "../../shared/ui/components.js";
import { store } from "../../app/store.js";
import { router } from "../../app/router.js";

// Render daftar ulasan (dipakai untuk tab "sebagai penjual" & "sebagai klien")
function renderReviewList(list, emptyText, isOwn = false) {
  if (!list || !list.length) {
    return `<div style="text-align:center; padding:60px 20px; background:#fafafa; border-radius:12px;">
      <i class="fa-solid fa-comment-slash" style="font-size:3rem; color:#ccc;"></i>
      <h3 style="margin:14px 0 8px;">Belum ada ulasan</h3>
      <p style="color:#888; max-width:420px; margin:0 auto;">
        ${isOwn ? "Anda belum menerima ulasan. Selesaikan pesanan untuk mendapatkan ulasan dari klien." : "Pengguna ini belum memiliki ulasan."}
      </p>
    </div>`;
  }
  return `<div style="display:flex; flex-direction:column; gap:16px;">${list
    .map(
      (r) => `
    <div class="review-item" style="padding:16px; background:#fff; border-radius:12px; transition:background .15s ease;">
      <div style="display:flex; gap:12px; align-items:center;">
        ${avatar(r.isAnonymous ? { name: "Anonim" } : r.reviewer || { name: "User", id: r.reviewerId }, "sm")}
        <div style="flex:1;">
          <strong>${escape(r.isAnonymous ? "Anonim" : r.reviewer?.name || "User")}</strong>
          <div style="font-size:11px; color:#999; margin-top:2px;">${timeAgo(r.createdAt)}</div>
        </div>
        <div style="color:#f5b042; font-size:14px;">${"★".repeat(r.rating || 5)}${"☆".repeat(5 - (r.rating || 5))}</div>
      </div>
      <p style="margin:12px 0 0 52px; color:#555; font-size:14px; line-height:1.5;">${escape(r.comment || "")}</p>
    </div>`,
    )
    .join("")}</div>`;
}

export async function PublicProfilePage({ mount, params }) {
  mount.innerHTML = `<div class="container page"><div class="spinner"></div></div>`;
  const userId = params.id;

  try {
    const [u, services, reviewsByUser, jobs, stats, workHistory] =
      await Promise.all([
        api.get("/users/" + userId),
        api.get(`/users/${userId}/services`).catch(() => []),
        api
          .get(`/reviews/user/${userId}`)
          .catch(() => ({ all: [], asSeller: [], asBuyer: [] })),
        api.get(`/users/${userId}/jobs`).catch(() => []),
        api.get(`/users/${userId}/stats`).catch(() => ({
          totalEarnings: 0,
          completedOrders: 0,
          totalOrders: 0,
          averageRating: 0,
          reviewCount: 0,
        })),
        api.get(`/users/${userId}/work-history`).catch(() => []),
      ]);

    const me = store.getState().user;
    const isOwn = me && me.id === u.id;

    const reviewsAsSeller = Array.isArray(reviewsByUser?.asSeller)
      ? reviewsByUser.asSeller
      : [];
    const reviewsAsBuyer = Array.isArray(reviewsByUser?.asBuyer)
      ? reviewsByUser.asBuyer
      : [];
    const reviews = Array.isArray(reviewsByUser?.all) ? reviewsByUser.all : [];
    const avgRating = Number(stats?.averageRating) || Number(u.rating) || 0;
    const reviewCount = Number(stats?.reviewCount) || reviews.length || 0;

    const history = Array.isArray(workHistory) ? workHistory : [];
    const totalServices = services.length;
    const totalJobs = jobs.length;
    const completedOrders =
      Number(stats?.completedOrders) || u.completedOrders || 0;
    const totalEarnings = Number(stats?.totalEarnings) || 0;

    mount.innerHTML = `
      <div class="container page" style="max-width:1200px; margin:0 auto; padding:20px;">
        <a href="#/marketplace" class="text-sm" data-testid="public-profile-back" style="display:inline-block; margin-bottom:20px; text-decoration:none; color:#0a66c2;">
          <i class="fa-solid fa-arrow-left"></i> Kembali ke Marketplace
        </a>

        <!-- Profile Header Card -->
        <div class="card card-pad-lg" style="background:#fff; border-radius:16px; padding:24px; margin-bottom:24px; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <div style="display:flex; justify-content:space-between; gap:32px; align-items:flex-start; flex-wrap:wrap;">
            
            <div style="display:flex; gap:24px; align-items:flex-start; flex:1;">
              <div style="position: relative;">
                ${avatar(u, "xl")}
                ${
                  isOwn
                    ? `
                  <label for="avatar-upload" class="btn btn-secondary" style="margin-top:10px; display:block; text-align:center; cursor:pointer; font-size:12px; padding:6px 12px;">
                    <i class="fa-solid fa-camera"></i> Ubah Foto
                  </label>
                  <input id="avatar-upload" type="file" accept="image/*" hidden>
                `
                    : ""
                }
              </div>

              <div style="flex:1;">
                <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                  <h1 style="margin:0;font-size:2.2rem;font-weight:800;">
                    ${escape(u.name || "User")}
                  </h1>
                  ${
                    u.verified
                      ? `<i class="fa-solid fa-circle-check"
                           style="color:#2563eb;font-size:20px;"
                           title="Akun Terverifikasi"></i>`
                      : ""
                  }
                </div>

                <p style="margin:8px 0 14px;color:#666;font-size:15px;line-height:1.6;">
                  ${escape(
                    u.bio ||
                      (isOwn
                        ? "Tambahkan bio untuk meningkatkan kepercayaan calon klien."
                        : "Pengguna ini belum menambahkan deskripsi profil."),
                  )}
                </p>

                <div style="display:flex;gap:18px;flex-wrap:wrap;color:#666;font-size:14px;">
                  <span><i class="fa-solid fa-star" style="color:#f5b042"></i> ${avgRating.toFixed(1)} (${reviewCount} ulasan)</span>
                  <span><i class="fa-solid fa-bag-shopping"></i> ${completedOrders} pesanan selesai</span>
                  ${u.city ? `<span><i class="fa-solid fa-location-dot"></i> ${escape(u.city)}</span>` : ""}
                  <span><i class="fa-solid fa-calendar"></i> Aktif sejak ${new Date(u.createdAt).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</span>
                </div>
              </div>
            </div>

            <div style="display:flex;gap:12px;align-self:center;flex-wrap:wrap;">
              ${
                !isOwn
                  ? `
                <button class="btn btn-primary" id="chat-user-btn" style="background:#0a66c2; color:#fff; border:none; padding:10px 20px; border-radius:8px; cursor:pointer;">
                  <i class="fa-solid fa-message"></i> Chat
                </button>
                <button class="btn btn-secondary" id="report-user-btn" style="background:#f0f0f0; border:none; padding:10px 20px; border-radius:8px; cursor:pointer;">
                  <i class="fa-solid fa-flag"></i> Laporkan
                </button>
              `
                  : `
                <a class="btn btn-secondary" href="#/dashboard" style="background:#f0f0f0; text-decoration:none; padding:10px 20px; border-radius:8px;">
                  <i class="fa-solid fa-gauge-high"></i> Dashboard
                </a>
                <a class="btn btn-primary" href="#/settings" style="background:#0a66c2; color:#fff; text-decoration:none; padding:10px 20px; border-radius:8px;">
                  <i class="fa-solid fa-pen"></i> Edit Profil
                </a>
              `
              }
            </div>

          </div>
        </div>

        <!-- Activity Feed -->
        <div style="background:#fafafa; border:1px solid #ececec; border-radius:14px; padding:18px; margin-bottom:22px;">
          <div style="font-weight:700;margin-bottom:12px;">
            <i class="fa-solid fa-clock-rotate-left"></i> Aktivitas Terbaru
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;color:#555;font-size:14px;">
            <div>✓ Profil diperbarui</div>
            ${completedOrders > 0 ? `<div>✓ Menyelesaikan ${completedOrders} pesanan</div>` : ""}
            ${totalServices > 0 ? `<div>✓ Memiliki ${totalServices} jasa aktif</div>` : ""}
            ${reviewCount > 0 ? `<div>⭐ Menerima ${reviewCount} ulasan</div>` : ""}
          </div>
        </div>

        <!-- Statistik Ringkasan -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px,1fr)); gap:16px; margin-bottom:24px;">
          <div class="stat-card clickable-stat" data-target-tab="reviews" style="cursor:pointer; background:#fff; text-align:center; padding:16px; border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,0.1); transition:all .18s ease;">
            <div style="font-size:2rem; font-weight:700; color:#f5b042;"><i class="fa-solid fa-star" style="font-size:1.3rem;"></i> ${avgRating.toFixed(1)}</div>
            <div style="font-size:13px; color:#666;">Rating (${reviewCount} ulasan)</div>
          </div>
          <div class="stat-card clickable-stat" data-target-tab="history" style="cursor:pointer; background:#fff; text-align:center; padding:16px; border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,0.1); transition:all .18s ease;">
            <div style="font-size:2rem; font-weight:700; color:#0a66c2;">${completedOrders}</div>
            <div style="font-size:13px; color:#666;">Pesanan Selesai</div>
          </div>
          <div class="stat-card clickable-stat" data-target-tab="services" style="cursor:pointer; background:#fff; text-align:center; padding:16px; border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,0.1); transition:all .18s ease;">
            <div style="font-size:2rem; font-weight:700; color:#0a66c2;">${totalServices}</div>
            <div style="font-size:13px; color:#666;">Jasa Ditawarkan</div>
          </div>
          <div class="stat-card clickable-stat" data-target-tab="jobs" style="cursor:pointer; background:#fff; text-align:center; padding:16px; border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,0.1); transition:all .18s ease;">
            <div style="font-size:2rem; font-weight:700; color:#0a66c2;">${totalJobs}</div>
            <div style="font-size:13px; color:#666;">Pekerjaan Diposting</div>
          </div>
        </div>

        <!-- Tab Navigation -->
        <div style="display:flex; gap:8px; border-bottom:1px solid #e0e0e0; margin-bottom:24px; overflow-x:auto; flex-wrap:wrap;">
          <button class="tab-btn active" data-tab="services" style="padding:12px 20px; background:none; border:none; cursor:pointer; font-weight:600; color:#0a66c2; border-bottom:2px solid #0a66c2; white-space:nowrap; transition:all .15s ease;">
            🛠 Jasa Saya (${totalServices})
          </button>
          <button class="tab-btn" data-tab="history" style="padding:12px 20px; background:none; border:none; cursor:pointer; font-weight:600; color:#666; white-space:nowrap; transition:all .15s ease;">
            💼 Riwayat Pekerjaan (${history.length})
          </button>
          <button class="tab-btn" data-tab="jobs" style="padding:12px 20px; background:none; border:none; cursor:pointer; font-weight:600; color:#666; white-space:nowrap; transition:all .15s ease;">
            📋 Lowongan Saya (${totalJobs})
          </button>
          <button class="tab-btn" data-tab="reviews" style="padding:12px 20px; background:none; border:none; cursor:pointer; font-weight:600; color:#666; white-space:nowrap; transition:all .15s ease;">
            ⭐ Ulasan (${reviews.length})
          </button>
        </div>

        <!-- Tab Content: Services -->
        <div id="tab-services" class="tab-content active">
          <div id="services-list" data-testid="public-profile-services">
            ${
              services.length
                ? `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px,1fr)); gap:20px;">
                    ${services.map((s) => serviceCard(s)).join("")}
                  </div>`
                : `<div style="text-align:center; padding:60px 20px; background:#fafafa; border-radius:12px;">
                    <i class="fa-solid fa-box-open" style="font-size:3rem; color:#ccc;"></i>
                    <h3 style="margin:14px 0 8px;">Belum ada jasa</h3>
                    <p style="color:#888;max-width:420px;margin:0 auto;">
                    ${
                      isOwn
                        ? "Anda belum menawarkan jasa apa pun. Mulai tawarkan kemampuan Anda dan biarkan orang lain menemukan Anda."
                        : "Pengguna ini belum menawarkan jasa apa pun saat ini."
                    }
                    </p>
                    ${
                      isOwn
                        ? `<div style="margin-top:20px;">
                             <a href="#/dashboard/manage-services"
                                class="btn btn-primary" style="background:#0a66c2; color:#fff; text-decoration:none; padding:10px 20px; border-radius:8px; display:inline-block;">
                                <i class="fa-solid fa-plus"></i> Tambah Jasa
                             </a>
                           </div>`
                        : ""
                    }
                  </div>`
            }
          </div>
        </div>

        <!-- Tab Content: Work History -->
        <div id="tab-history" class="tab-content" style="display:none;">
          ${
            history.length
              ? `<div style="display:flex; flex-direction:column; gap:12px;">
                  ${history
                    .map((h) => {
                      const done =
                        String(h.status).toUpperCase() === "COMPLETED";
                      return `
                    <div class="history-card" style="background:#fff; border-radius:12px; padding:16px; box-shadow:0 1px 3px rgba(0,0,0,0.1); display:flex; gap:14px; align-items:flex-start; flex-wrap:wrap;">
                      <div style="flex:1; min-width:200px;">
                        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:6px;">
                          <span class="badge" style="background:${done ? "#4caf50" : "#f5b042"}; color:#fff; padding:3px 10px; border-radius:20px; font-size:11px;">${done ? "Selesai" : escape(String(h.status).replace(/_/g, " "))}</span>
                          <span style="font-size:11px; color:#999;">${escape(h.label || "")}</span>
                        </div>
                        <h4 style="margin:4px 0; font-size:1rem;">${escape(h.title || "Pekerjaan")}</h4>
                        <div style="display:flex; gap:16px; flex-wrap:wrap; font-size:13px; color:#666;">
                          ${h.client?.name ? `<span><i class="fa-solid fa-user"></i> ${escape(h.client.name)}</span>` : ""}
                          ${h.completedAt ? `<span><i class="fa-solid fa-calendar-check"></i> ${new Date(h.completedAt).toLocaleDateString("id-ID")}</span>` : ""}
                          ${h.review ? `<span style="color:#f5b042;"><i class="fa-solid fa-star"></i> ${h.review.rating}</span>` : ""}
                        </div>
                      </div>
                      <div style="text-align:right; font-weight:700; color:#2e7d32; white-space:nowrap;">${fmtIDR(h.amount || 0)}</div>
                    </div>`;
                    })
                    .join("")}
                </div>`
              : `<div style="text-align:center; padding:60px 20px; background:#fafafa; border-radius:12px;">
                  <i class="fa-solid fa-clock-rotate-left" style="font-size:3rem; color:#ccc;"></i>
                  <h3 style="margin:14px 0 8px;">Belum ada riwayat kerja</h3>
                  <p style="color:#888;max-width:420px;margin:0 auto;">
                  ${
                    isOwn
                      ? "Anda belum memiliki riwayat pekerjaan. Mulai terima pesanan untuk membangun portofolio Anda."
                      : "Pengguna ini belum memiliki riwayat pekerjaan."
                  }
                  </p>
                </div>`
          }
        </div>

        <!-- Tab Content: Jobs -->
        <div id="tab-jobs" class="tab-content" style="display:none;">
          <div id="jobs-list" data-testid="public-profile-jobs">
            ${
              jobs.length
                ? `<div style="display:flex; flex-direction:column; gap:16px;">
                    ${jobs
                      .map(
                        (j) => `
                      <div class="job-card" data-job-id="${j.id}" style="background:#fff; border-radius:12px; padding:20px; cursor:pointer; box-shadow:0 1px 3px rgba(0,0,0,0.1); transition:box-shadow 0.2s, transform 0.2s;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap;">
                          <div style="flex:1;">
                            <div style="display:flex; gap:8px; margin-bottom:8px; flex-wrap:wrap;">
                              <span class="badge" style="background:${j.status === "OPEN" || j.status === "open" ? "#4caf50" : "#999"}; color:#fff; padding:4px 12px; border-radius:20px; font-size:12px;">
                                ${j.status === "OPEN" || j.status === "open" ? "Aktif" : "Ditutup"}
                              </span>
                              <span style="font-size:12px; color:#999;">${timeAgo(j.createdAt)}</span>
                            </div>
                            <h3 style="margin:8px 0; font-size:1.1rem;">${escape(j.title)}</h3>
                            <p style="color:#666; font-size:14px; line-height:1.5; margin:8px 0; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
                              ${escape(j.description?.substring(0, 120) || "")}${(j.description?.length || 0) > 120 ? "..." : ""}
                            </p>
                            <div style="display:flex; gap:16px; margin-top:12px; font-size:13px; color:#666; flex-wrap:wrap;">
                              <span><i class="fa-solid fa-money-bill-wave"></i> ${fmtIDR(j.budget)}</span>
                              <span><i class="fa-solid fa-location-dot"></i> ${escape(j.city || "Remote")}</span>
                              ${j.deadline ? `<span><i class="fa-solid fa-calendar"></i> Deadline: ${new Date(j.deadline).toLocaleDateString()}</span>` : ""}
                            </div>
                          </div>
                          <div style="text-align:right; margin-top:8px;">
                            <span style="background:#f0f0f0; padding:4px 12px; border-radius:20px; font-size:12px;">${j.applicationCount || 0} pelamar</span>
                          </div>
                        </div>
                      </div>
                    `,
                      )
                      .join("")}
                  </div>`
                : `<div style="text-align:center; padding:60px 20px; background:#fafafa; border-radius:12px;">
                    <i class="fa-solid fa-briefcase" style="font-size:3rem; color:#ccc;"></i>
                    <h3 style="margin:14px 0 8px;">Belum ada pekerjaan</h3>
                    <p style="color:#888;max-width:420px;margin:0 auto;">
                    ${
                      isOwn
                        ? "Anda belum memposting pekerjaan. Buat lowongan sekarang untuk menemukan freelancer terbaik."
                        : "Pengguna ini belum memposting pekerjaan."
                    }
                    </p>
                    ${
                      isOwn
                        ? `<div style="margin-top:20px;">
                             <a href="#/jobs/create"
                                class="btn btn-primary" style="background:#0a66c2; color:#fff; text-decoration:none; padding:10px 20px; border-radius:8px; display:inline-block;">
                                <i class="fa-solid fa-plus"></i> Buat Lowongan
                             </a>
                           </div>`
                        : ""
                    }
                  </div>`
            }
          </div>
        </div>

        <!-- Tab Content: Reviews (dua arah) -->
        <div id="tab-reviews" class="tab-content" style="display:none;">
          <div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
            <button class="rev-sub-btn active" data-rev="seller" style="padding:8px 16px; border:1px solid #0a66c2; background:#0a66c2; color:#fff; border-radius:20px; cursor:pointer; font-size:13px; transition:all 0.2s;">Sebagai Penjual (${reviewsAsSeller.length})</button>
            <button class="rev-sub-btn" data-rev="buyer" style="padding:8px 16px; border:1px solid #ccc; background:#fff; color:#666; border-radius:20px; cursor:pointer; font-size:13px; transition:all 0.2s;">Sebagai Klien (${reviewsAsBuyer.length})</button>
          </div>
          <div id="rev-seller" class="rev-sub-content" style="background:#fff; border-radius:12px; padding:20px; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            ${renderReviewList(reviewsAsSeller, "Belum ada ulasan dari klien", isOwn)}
          </div>
          <div id="rev-buyer" class="rev-sub-content" style="display:none; background:#fff; border-radius:12px; padding:20px; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            ${renderReviewList(reviewsAsBuyer, "Belum ada ulasan sebagai klien", isOwn)}
          </div>
        </div>
      </div>
      
      <style>
        .stat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.12);
        }
        
        .tab-btn:hover {
          background: #f5f8ff;
          border-radius: 8px 8px 0 0;
          color: #0a66c2 !important;
        }
        
        .review-item {
          transition: background .15s ease;
        }
        
        .review-item:hover {
          background: #fafafa;
        }
        
        .card {
          transition: box-shadow .18s ease;
        }
        
        .card:hover {
          box-shadow: 0 6px 18px rgba(0,0,0,0.08);
        }
        
        .job-card {
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .job-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .service-card {
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .service-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
      </style>
    `;

    // Tab switching
    const tabs = mount.querySelectorAll(".tab-btn");
    const contents = {
      services: mount.querySelector("#tab-services"),
      history: mount.querySelector("#tab-history"),
      jobs: mount.querySelector("#tab-jobs"),
      reviews: mount.querySelector("#tab-reviews"),
    };

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const target = tab.dataset.tab;
        tabs.forEach((t) => {
          t.classList.remove("active");
          t.style.color = "#666";
          t.style.borderBottom = "none";
        });
        tab.classList.add("active");
        tab.style.color = "#0a66c2";
        tab.style.borderBottom = "2px solid #0a66c2";

        Object.values(contents).forEach((c) => {
          if (c) c.style.display = "none";
        });
        if (contents[target]) contents[target].style.display = "block";
      });
    });

    // Clickable stats
    mount.querySelectorAll(".clickable-stat").forEach((el) => {
      el.addEventListener("click", () => {
        const target = el.dataset.targetTab;
        const tabBtn = mount.querySelector(`.tab-btn[data-tab="${target}"]`);
        if (tabBtn) tabBtn.click();
      });
    });

    // Sub-tab ulasan
    const revBtns = mount.querySelectorAll(".rev-sub-btn");
    revBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const which = btn.dataset.rev;
        revBtns.forEach((b) => {
          const active = b === btn;
          b.classList.toggle("active", active);
          b.style.background = active ? "#0a66c2" : "#fff";
          b.style.color = active ? "#fff" : "#666";
          b.style.borderColor = active ? "#0a66c2" : "#ccc";
        });
        const sEl = mount.querySelector("#rev-seller");
        const bEl = mount.querySelector("#rev-buyer");
        if (sEl) sEl.style.display = which === "seller" ? "block" : "none";
        if (bEl) bEl.style.display = which === "buyer" ? "block" : "none";
      });
    });

    // Avatar upload handler
    const avatarInput = mount.querySelector("#avatar-upload");
    if (avatarInput) {
      avatarInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("avatar", file);

        try {
          const result = await api.upload("/users/avatar", formData);
          toast("Foto profil berhasil diupdate!", "success");
          setTimeout(() => window.location.reload(), 1000);
        } catch (err) {
          toast(err.message || "Gagal upload foto", "error");
        }
      });
    }

    // Chat button
    document
      .getElementById("chat-user-btn")
      ?.addEventListener("click", async () => {
        if (!me) {
          toast("Silakan login dulu", "warning");
          return router.navigate("/login");
        }
        try {
          const r = await api.post("/chat/conversations", {
            recipientId: u.id,
          });
          router.navigate("/chat/" + r.id);
        } catch (err) {
          toast(err.message, "error");
        }
      });

    // Report button
    document
      .getElementById("report-user-btn")
      ?.addEventListener("click", () => {
        if (!me) {
          toast("Silakan login dulu untuk melaporkan", "warning");
          return;
        }
        toast("Laporan terkirim. Tim Tolongin akan meninjau.", "success");
      });

    // Click job card to navigate
    document.querySelectorAll(".job-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest(".job-card")) {
          const jobId = card.dataset.jobId;
          router.navigate(`/jobs/${jobId}`);
        }
      });
    });
  } catch (err) {
    console.error("PublicProfilePage error:", err);
    mount.innerHTML = `<div class="container page">
      <div style="text-align:center; padding:60px 20px;">
        <i class="fa-solid fa-user-slash" style="font-size:3rem; color:#ccc;"></i>
        <h3>User tidak ditemukan</h3>
        <p style="color:#999;">${escape(err.message)}</p>
        <a href="#/marketplace" class="btn btn-primary" style="display:inline-block; margin-top:16px; padding:10px 20px; background:#0a66c2; color:#fff; text-decoration:none; border-radius:8px;">Kembali ke Marketplace</a>
      </div>
    </div>`;
  }
}

// frontend/src/features/dashboard/DashboardPages.js

import { api } from "../../shared/utils/api.js";
import {
  escape,
  fmtIDR,
  toast,
  modal,
  confirmModal,
} from "../../shared/utils/helpers.js";
import { statusPill, serviceCard, empty, avatar } from "../../shared/ui/components.js";
import { store } from "../../app/store.js";
import { router } from "../../app/router.js";

// Status order yang masih dianggap aktif (bukan selesai/batal/sengketa)
const ACTIVE_STATUSES = [
  "WAITING_CONFIRMATION",
  "ACCEPTED",
  "IN_PROGRESS",
  "IN_REVIEW",
  "REVISION_REQUESTED",
];

// Container untuk konten dashboard
let dashboardContentContainer = null;

// Bar chart sederhana berbasis inline SVG
function svgBarChart(data, opts = {}) {
  const {
    width = 520,
    height = 200,
    barColor = "#0a66c2",
    valueFormatter = (v) => v,
  } = opts;
  if (!data || !data.length) {
    return `<p class="text-muted" style="text-align:center;padding:24px">Belum ada data untuk ditampilkan.</p>`;
  }
  const pad = { top: 16, right: 12, bottom: 32, left: 12 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const n = data.length;
  const slot = chartW / n;
  const barW = Math.min(slot * 0.6, 48);
  const bars = data
    .map((d, i) => {
      const h = Math.round((d.value / maxVal) * chartH);
      const x = pad.left + i * slot + (slot - barW) / 2;
      const y = pad.top + (chartH - h);
      const labelY = height - pad.bottom + 18;
      const valY = y - 6;
      return `
        <g>
          <rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="4" fill="${barColor}">
            <title>${escape(String(d.label))}: ${escape(String(valueFormatter(d.value)))}</title>
          </rect>
          ${d.value > 0 ? `<text x="${x + barW / 2}" y="${valY}" text-anchor="middle" font-size="10" fill="#666">${escape(String(valueFormatter(d.value)))}</text>` : ""}
          <text x="${x + barW / 2}" y="${labelY}" text-anchor="middle" font-size="11" fill="#888">${escape(String(d.label))}</text>
        </g>`;
    })
    .join("");
  return `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Grafik batang">
      <line x1="${pad.left}" y1="${pad.top + chartH}" x2="${width - pad.right}" y2="${pad.top + chartH}" stroke="#e0e0e0" stroke-width="1"/>
      ${bars}
    </svg>`;
}

// Bangun data 6 bulan terakhir
function buildMonthlySeries(orders, valueKey) {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString("id-ID", { month: "short" }),
      value: 0,
    });
  }
  const idx = {};
  months.forEach((m) => (idx[m.key] = m));
  orders.forEach((o) => {
    const ref = o.completedAt || o.createdAt;
    if (!ref) return;
    const d = new Date(ref);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (idx[key]) {
      idx[key].value += valueKey === "earnings" ? o.amount || 0 : 1;
    }
  });
  return months;
}

// SIDEBAR — anchor tags trigger hashchange so router stays in sync
function sidebar(active) {
  const u = store.getState().user;
  const link = (key, icon, label, testid) =>
    `<a class="side-link ${active === key ? "active" : ""}" href="#/dashboard/${key}" data-nav="${key}" data-testid="${testid}">
       <i class="fa-solid ${icon}"></i> ${label}
     </a>`;
  return `<aside class="dash-side">
    <div class="who">
      ${avatar(u, "lg")}
      <div><div class="name">${escape(u.name)}</div><div class="role">${u.role === "ADMIN" ? "Admin" : "Anggota TOLONGIN"}</div></div>
    </div>
    <div class="side-group">
      ${link("overview", "fa-gauge", "Overview", "side-overview")}
    </div>
    <div class="side-group">
      <div class="side-label">Aktivitas Saya</div>
      ${link("transactions", "fa-receipt", "Transaksi", "side-transactions")}
      ${link("my-applications", "fa-file-circle-check", "Lamaran Saya", "side-applications")}
      ${link("favorites", "fa-heart", "Favorit", "side-favorites")}
    </div>
    <div class="side-group">
      <div class="side-label">Saya Menawarkan</div>
      ${link("manage-services", "fa-box", "Kelola Jasa", "side-manage-services")}
      ${link("manage-jobs", "fa-folder-open", "Kelola Lowongan", "side-manage-jobs")}
    </div>
    <div class="side-group">
      <div class="side-label">Keuangan</div>
      ${link("earnings", "fa-coins", "Keuangan", "side-earnings")}
    </div>
    <div class="side-group">
      <div class="side-label">Akun Saya</div>
      ${link("account", "fa-user-circle", "Profil & Pengaturan", "side-account")}
    </div>
  </aside>`;
}

// Fungsi setup upload gambar
function setupImageUpload() {
  const uploadZone = document.getElementById("upload-zone");
  const imageFile = document.getElementById("imageFile");
  const imageUrlInput = document.getElementById("imageUrl");
  const imagePreview = document.getElementById("image-preview");
  const previewImg = document.getElementById("preview-img");
  const removeImage = document.getElementById("remove-image");

  let uploadStatus = document.getElementById("upload-status");
  if (!uploadStatus && uploadZone) {
    uploadStatus = document.createElement("div");
    uploadStatus.id = "upload-status";
    uploadStatus.style.cssText =
      "margin-top:8px; font-size:12px; color:#666; display:none;";
    uploadZone.parentNode.appendChild(uploadStatus);
  }

  if (uploadZone) {
    const newUploadZone = uploadZone.cloneNode(true);
    uploadZone.parentNode.replaceChild(newUploadZone, uploadZone);
    newUploadZone.addEventListener("click", () => {
      const fileInput = document.getElementById("imageFile");
      if (fileInput) fileInput.click();
    });
  }

  if (imageFile) {
    const newImageFile = imageFile.cloneNode(true);
    imageFile.parentNode.replaceChild(newImageFile, imageFile);
    newImageFile.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        toast("File harus berupa gambar", "error");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast("Ukuran file maksimal 2MB", "error");
        return;
      }

      const currentPreviewImg = document.getElementById("preview-img");
      const currentImagePreview = document.getElementById("image-preview");
      const currentUploadZone = document.getElementById("upload-zone");
      const currentImageUrlInput = document.getElementById("imageUrl");
      const currentUploadStatus = document.getElementById("upload-status");

      const reader = new FileReader();
      reader.onload = (event) => {
        if (currentPreviewImg) currentPreviewImg.src = event.target.result;
        if (currentImagePreview) currentImagePreview.style.display = "block";
        if (currentUploadZone) currentUploadZone.style.display = "none";
      };
      reader.readAsDataURL(file);

      if (currentUploadStatus) {
        currentUploadStatus.style.display = "block";
        currentUploadStatus.innerHTML =
          '<i class="fa-solid fa-spinner fa-spin"></i> Mengupload gambar...';
      }

      try {
        const formData = new FormData();
        formData.append("file", file);
                const uploadResult = await api.post("/uploads?folder=services", formData);
        const uploadedUrl =
          uploadResult.url || uploadResult.secure_url || uploadResult.fileUrl;
        if (currentImageUrlInput) currentImageUrlInput.value = uploadedUrl;
        if (currentUploadStatus) {
          currentUploadStatus.innerHTML =
            '<i class="fa-solid fa-check-circle" style="color:#10b981;"></i> Gambar berhasil diupload!';
          setTimeout(() => {
            if (currentUploadStatus) currentUploadStatus.style.display = "none";
          }, 2000);
        }
      } catch (err) {
        console.error("Upload error:", err);
        if (currentUploadStatus) {
          currentUploadStatus.innerHTML =
            '<i class="fa-solid fa-exclamation-circle" style="color:#ef4444;"></i> Gagal upload gambar';
        }
        toast("Gagal upload gambar: " + (err.message || "Coba lagi"), "error");
        const currentImagePreview = document.getElementById("image-preview");
        const currentUploadZone = document.getElementById("upload-zone");
        if (currentImagePreview) currentImagePreview.style.display = "none";
        if (currentUploadZone) currentUploadZone.style.display = "block";
      }
    });
  }

  if (removeImage) {
    const newRemoveImage = removeImage.cloneNode(true);
    removeImage.parentNode.replaceChild(newRemoveImage, removeImage);
    newRemoveImage.addEventListener("click", () => {
      const currentImagePreview = document.getElementById("image-preview");
      const currentUploadZone = document.getElementById("upload-zone");
      const currentImageUrlInput = document.getElementById("imageUrl");
      const currentImageFile = document.getElementById("imageFile");
      const currentUploadStatus = document.getElementById("upload-status");
      if (currentImagePreview) currentImagePreview.style.display = "none";
      if (currentUploadZone) currentUploadZone.style.display = "block";
      if (currentImageUrlInput) currentImageUrlInput.value = "";
      if (currentImageFile) currentImageFile.value = "";
      if (currentUploadStatus) currentUploadStatus.style.display = "none";
    });
  }
}

// Fungsi untuk load konten berdasarkan navigasi
async function loadDashboardContent(section, mountEl) {
  if (!dashboardContentContainer) {
    dashboardContentContainer = mountEl.querySelector("section");
  }
  const container = dashboardContentContainer;
  if (!container) return;
  container.innerHTML = '<div class="spinner"></div>';
  try {
    // sub-routes: manage-services/new, manage-services/edit/:id, manage-jobs/new, manage-jobs/edit/:id
    const hashRest = location.hash.replace(/^#?\/dashboard\/?/, "");
    const parts = hashRest.split("/").filter(Boolean);
    const sub = parts[1]; // "new" | "edit"
    const id = parts[2];

    switch (section) {
      case "overview":
        await loadOverview(container);
        break;
      case "transactions":
        await loadTransactions(container);
        break;
      case "manage-services":
        if (sub === "new") {
          await loadManageServices(container, { openForm: "create" });
        } else if (sub === "edit" && id) {
          await loadManageServices(container, { openForm: "edit", id });
        } else {
          await loadManageServices(container);
        }
        break;
      case "manage-jobs":
        if (sub === "new") {
          await loadManageJobs(container, { openForm: "create" });
        } else if (sub === "edit" && id) {
          await loadManageJobs(container, { openForm: "edit", id });
        } else {
          await loadManageJobs(container);
        }
        break;
      case "my-applications":
        await loadMyApplications(container);
        break;
      case "favorites":
        await loadFavorites(container);
        break;
      case "earnings":
        await loadEarnings(container);
        break;
      case "account":
        await loadAccount(container);
        break;
      default:
        await loadOverview(container);
    }
  } catch (err) {
    console.error("Load dashboard content error:", err);
    container.innerHTML = empty("Gagal memuat", err.message);
  }
}

// ==================== MY APPLICATIONS ====================
async function loadMyApplications(container) {
  try {
    const apps = await api.get("/applications/seller");
    const list = Array.isArray(apps) ? apps : apps?.data || [];
    container.innerHTML = `
      <div class="page-header"><h1 class="page-title">Lamaran Saya</h1>
        <p class="page-subtitle">Lacak status semua lamaran kerja yang Anda kirim</p>
      </div>
      ${list.length === 0 ? empty("Belum ada lamaran", "Mulai lamar pekerjaan di halaman Cari Kerja.", "fa-file-circle-check") : ""}
      <div class="grid" style="grid-template-columns:1fr; gap:12px;">
        ${list.map((a) => `
          <div class="card card-pad" data-testid="application-${a.id}">
            <div class="flex-between" style="align-items:flex-start; gap:1rem;">
              <div style="flex:1; min-width:0;">
                <div class="flex gap-sm mb-1">${statusPill(a.status)}<span class="text-xs text-muted">${a.createdAt ? new Date(a.createdAt).toLocaleDateString("id-ID") : ""}</span></div>
                <h3 style="margin:.2rem 0;"><a href="#/jobs/${a.jobId}" style="color:inherit; text-decoration:none;">${escape(a.job?.title || "Pekerjaan")}</a></h3>
                <div class="text-sm text-muted" style="margin-bottom:.5rem;">${escape((a.coverLetter || "").slice(0, 160))}${(a.coverLetter || "").length > 160 ? "…" : ""}</div>
                <div class="flex gap-md text-sm">
                  <span><i class="fa-solid fa-money-bill-wave"></i> ${fmtIDR(a.proposedPrice)}</span>
                  <span><i class="fa-solid fa-clock"></i> ${a.proposedDuration} hari</span>
                </div>
              </div>
              <div class="flex gap-sm" style="flex-direction:column; align-items:stretch;">
                <a class="btn btn-secondary btn-sm" href="#/jobs/${a.jobId}">Lihat Pekerjaan</a>
                ${a.status === "ACCEPTED" ? `<a class="btn btn-primary btn-sm" href="#/chat/${a.job?.buyerId || a.buyerId || ""}">Chat Pemilik</a>` : ""}
              </div>
            </div>
          </div>`).join("")}
      </div>`;
  } catch (e) {
    container.innerHTML = empty("Gagal memuat lamaran", e.message);
  }
}

// ==================== LOAD FUNCTIONS ====================

async function loadOverview(container) {
  const u = store.getState().user;
  try {
    const orders = await api.get("/orders");
    const asBuyer = orders.filter((o) => o.buyerId === u.id);
    const asSeller = orders.filter((o) => o.sellerId === u.id);
    const completedBuyer = asBuyer.filter((o) => o.status === "COMPLETED");
    const completedSeller = asSeller.filter((o) => o.status === "COMPLETED");
    const buyerSpent = completedBuyer.reduce((s, o) => s + (o.amount || 0), 0);
    const sellerEarned = completedSeller.reduce((s, o) => s + (o.amount || 0) * 0.95, 0);
    const pendingBuyer = asBuyer.filter((o) =>
      ACTIVE_STATUSES.includes(String(o.status).toUpperCase()),
    ).length;
    const pendingSeller = asSeller.filter((o) =>
      ACTIVE_STATUSES.includes(String(o.status).toUpperCase()),
    ).length;
    const rating = (u.rating || 0).toFixed(1);

    const earningSeries = buildMonthlySeries(completedSeller, "earnings");
    const buyerOrderSeries = buildMonthlySeries(asBuyer, "count");
    const hasEarnings = earningSeries.some((m) => m.value > 0);
    const hasBuyerOrders = buyerOrderSeries.some((m) => m.value > 0);

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Halo, ${escape(u.name.split(" ")[0])}! <span aria-hidden="true">👋</span></h1>
          <p class="page-subtitle">Berikut ringkasan aktivitas Anda</p>
        </div>
      </div>
      <div class="kpis" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px,1fr)); gap:1rem; margin-bottom:1.5rem;">
        <div class="kpi" data-testid="kpi-completed-buyer" style="background:#fff; border-radius:16px; padding:1.25rem; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <div class="ic" style="font-size:2rem; color:#0a66c2;"><i class="fa-solid fa-bag-shopping"></i></div>
          <div class="v" style="font-size:1.8rem; font-weight:700;">${completedBuyer.length}</div>
          <div class="l" style="color:#666; font-size:0.85rem;">Pesanan Selesai (Pembeli)</div>
        </div>
        <div class="kpi" data-testid="kpi-spent" style="background:#fff; border-radius:16px; padding:1.25rem; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <div class="ic" style="font-size:2rem; color:#2e7d32;"><i class="fa-solid fa-money-bill-wave"></i></div>
          <div class="v" style="font-size:1.4rem; font-weight:700;">${fmtIDR(buyerSpent)}</div>
          <div class="l" style="color:#666; font-size:0.85rem;">Total Belanja</div>
        </div>
        <div class="kpi" data-testid="kpi-earned" style="background:#fff; border-radius:16px; padding:1.25rem; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <div class="ic" style="font-size:2rem; color:#7c3aed;"><i class="fa-solid fa-coins"></i></div>
          <div class="v" style="font-size:1.4rem; font-weight:700;">${fmtIDR(sellerEarned)}</div>
          <div class="l" style="color:#666; font-size:0.85rem;">Penghasilan (Penjual)</div>
        </div>
        <div class="kpi" data-testid="kpi-rating" style="background:#fff; border-radius:16px; padding:1.25rem; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <div class="ic" style="font-size:2rem; color:#f5b042;"><i class="fa-solid fa-star"></i></div>
          <div class="v" style="font-size:1.8rem; font-weight:700;">${rating}</div>
          <div class="l" style="color:#666; font-size:0.85rem;">Rating Anda</div>
        </div>
        <div class="kpi" data-testid="kpi-pending" style="background:#fff; border-radius:16px; padding:1.25rem; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <div class="ic" style="font-size:2rem; color:#f59e0b;"><i class="fa-solid fa-hourglass-half"></i></div>
          <div class="v" style="font-size:1.8rem; font-weight:700;">${pendingBuyer + pendingSeller}</div>
          <div class="l" style="color:#666; font-size:0.85rem;">Pesanan Aktif</div>
        </div>
      </div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:1rem;margin-top:1rem">
        <div class="card card-pad-lg">
          <h3 style="margin:0 0 .25rem"><i class="fa-solid fa-chart-column"></i> Pendapatan 6 Bulan Terakhir</h3>
          <p class="text-muted text-sm" style="margin:0 0 .5rem">Dari pesanan yang selesai sebagai penjual</p>
          ${hasEarnings ? svgBarChart(earningSeries, { barColor: "#2e7d32", valueFormatter: (v) => (v >= 1000 ? Math.round(v / 1000) + "k" : v) }) : `<p class="text-muted" style="text-align:center;padding:24px">Belum ada pendapatan.</p>`}
        </div>
        <div class="card card-pad-lg">
          <h3 style="margin:0 0 .25rem"><i class="fa-solid fa-chart-simple"></i> Pesanan 6 Bulan Terakhir</h3>
          <p class="text-muted text-sm" style="margin:0 0 .5rem">Jumlah pesanan Anda sebagai pembeli</p>
          ${hasBuyerOrders ? svgBarChart(buyerOrderSeries, { barColor: "#0a66c2" }) : `<p class="text-muted" style="text-align:center;padding:24px">Belum ada pesanan.</p>`}
        </div>
      </div>
      <div class="card card-pad-lg mt-3">
        <h3>Pesanan Terbaru</h3>
        ${
          orders.slice(0, 5).length
            ? `
        <div class="scroll-x"><table class="tbl">
          <thead><tr><th>Order</th><th>Peran</th><th>Status</th><th>Total</th><th></th></tr></thead>
          <tbody>${orders
            .slice(0, 5)
            .map(
              (o) => `
            <tr data-testid="recent-order-${o.id}">
              <td><a href="#/orders/${o.id}" style="text-decoration:none;">${escape(o.title)}</a></td>
              <td><span class="badge ${o.buyerId === u.id ? "badge-info" : "badge-success"}">${o.buyerId === u.id ? "Pembeli" : "Penjual"}</span></td>
              <td>${statusPill(o.status)}</td>
              <td>${fmtIDR(o.amount)}</td>
              <td><a class="btn btn-secondary btn-sm" href="#/orders/${o.id}">Lihat</a></td>
            </tr>
          `,
            )
            .join("")}</tbody>
        </table></div>`
            : empty("Belum ada pesanan", "Mulai dari Marketplace atau Cari Kerja", "fa-receipt")
        }
      </div>
    `;
  } catch (e) {
    container.innerHTML = empty("Gagal memuat", e.message);
  }
}

async function loadTransactions(container) {
  const u = store.getState().user;
  try {
    const [buyerOrders, sellerOrders] = await Promise.all([
      api.get("/orders?role=buyer"),
      api.get("/orders?role=seller"),
    ]);

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Transaksi</h1>
        <p class="page-subtitle">Semua pesanan Anda sebagai pembeli dan penjual</p>
      </div>
      <div style="margin-bottom:1.5rem;">
        <div style="display:flex; gap:8px; border-bottom:1px solid #e0e0e0;">
          <button class="trans-tab-btn active" data-tab="buyer" style="padding:10px 16px; background:none; border:none; cursor:pointer; font-weight:600; color:#0a66c2; border-bottom:2px solid #0a66c2;">
            <i class="fa-solid fa-shopping-cart"></i> Sebagai Pembeli (${buyerOrders.length})
          </button>
          <button class="trans-tab-btn" data-tab="seller" style="padding:10px 16px; background:none; border:none; cursor:pointer; font-weight:600; color:#666;">
            <i class="fa-solid fa-store"></i> Sebagai Penjual (${sellerOrders.length})
          </button>
        </div>
        <div id="buyer-orders" class="trans-content" style="margin-top:1rem;">
          ${
            buyerOrders.length
              ? `
            <div class="scroll-x"><table class="tbl">
              <thead><tr><th>Order</th><th>Status</th><th>Total</th><th></th></tr></thead>
              <tbody>${buyerOrders
                .map(
                  (x) => `
                <tr>
                  <td>${escape(x.title)}</td>
                  <td>${statusPill(x.status)}</td>
                  <td>${fmtIDR(x.amount)}</td>
                  <td><a class="btn btn-secondary btn-sm" href="#/orders/${x.id}">Detail</a></td>
                </tr>
              `,
                )
                .join("")}</tbody>
            </table></div>
          `
              : empty("Belum ada pesanan sebagai pembeli")
          }
        </div>
        <div id="seller-orders" class="trans-content" style="display:none; margin-top:1rem;">
          ${
            sellerOrders.length
              ? `
            <div class="scroll-x"><table class="tbl">
              <thead><tr><th>Order</th><th>Pembeli</th><th>Status</th><th>Total</th><th></th></tr></thead>
              <tbody>${sellerOrders
                .map(
                  (x) => `
                <tr>
                  <td>${escape(x.title)}</td>
                  <td>${escape(x.buyer?.name)}</td>
                  <td>${statusPill(x.status)}</td>
                  <td>${fmtIDR(x.amount)}</td>
                  <td><a class="btn btn-secondary btn-sm" href="#/orders/${x.id}">Kelola</a></td>
                </tr>
              `,
                )
                .join("")}</tbody>
            </table></div>
          `
              : empty("Belum ada pesanan sebagai penjual")
          }
        </div>
      </div>
    `;

    const tabs = container.querySelectorAll(".trans-tab-btn");
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

        const buyerDiv = container.querySelector("#buyer-orders");
        const sellerDiv = container.querySelector("#seller-orders");
        if (buyerDiv)
          buyerDiv.style.display = target === "buyer" ? "block" : "none";
        if (sellerDiv)
          sellerDiv.style.display = target === "seller" ? "block" : "none";
      });
    });
  } catch (e) {
    container.innerHTML = empty("Gagal", e.message);
  }
}

async function loadManageServices(container, opts = {}) {
  await loadSellerServices(container, opts);
}

async function loadManageJobs(container, opts = {}) {
  await loadBuyerJobs(container, opts);
}

async function loadFavorites(container) {
  try {
    const favs = await api.get("/favorites");
    container.innerHTML = `
      <div class="page-header"><h1 class="page-title">Freelancer Favorit</h1></div>
      ${favs.length ? `<div class="grid grid-3">${favs.map((s) => serviceCard(s, { favorited: true })).join("")}</div>` : empty("Belum ada favorit", "Tambahkan jasa ke favorit dari marketplace")}
    `;
  } catch (e) {
    container.innerHTML = empty("Gagal", e.message);
  }
}

async function loadEarnings(container) {
  try {
    const o = await api.get("/orders?role=seller");
    const done = o.filter((x) => x.status === "COMPLETED");
    const pending = o.filter((x) =>
      ACTIVE_STATUSES.includes(String(x.status).toUpperCase()),
    );
    const total = done.reduce((s, x) => s + (x.amount || 0) * 0.95, 0);
    container.innerHTML = `
      <div class="page-header"><h1 class="page-title">Keuangan</h1></div>
      <div class="kpis" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px,1fr)); gap:1rem;">
        <div class="kpi" style="background:#fff; border-radius:16px; padding:1.25rem; text-align:center;">
          <div class="ic"><i class="fa-solid fa-wallet" style="font-size:2rem; color:#2e7d32;"></i></div>
          <div class="v" style="font-size:1.8rem; font-weight:700;">${fmtIDR(total)}</div>
          <div class="l">Saldo Tersedia</div>
        </div>
        <div class="kpi" style="background:#fff; border-radius:16px; padding:1.25rem; text-align:center;">
          <div class="ic"><i class="fa-solid fa-hourglass" style="font-size:2rem; color:#f59e0b;"></i></div>
          <div class="v" style="font-size:1.8rem; font-weight:700;">${fmtIDR(pending.reduce((s, x) => s + (x.amount || 0) * 0.95, 0))}</div>
          <div class="l">Pending</div>
        </div>
        <div class="kpi" style="background:#fff; border-radius:16px; padding:1.25rem; text-align:center;">
          <div class="ic"><i class="fa-solid fa-trophy" style="font-size:2rem; color:#0a66c2;"></i></div>
          <div class="v" style="font-size:1.8rem; font-weight:700;">${done.length}</div>
          <div class="l">Pesanan Selesai</div>
        </div>
      </div>
      <div class="card card-pad-lg mt-3 flex-between">
        <div><h3>Tarik Penghasilan</h3><p class="text-muted">Withdraw ke rekening bank Anda</p></div>
        <button class="btn btn-primary" onclick="window.dispatchEvent(new CustomEvent('toast', {detail: {type: 'info', text: 'Fitur withdraw demo - hubungi support'}}))">
          <i class="fa-solid fa-money-bill-transfer"></i> Tarik Sekarang
        </button>
      </div>
    `;
  } catch (e) {
    container.innerHTML = empty("Gagal", e.message);
  }
}

async function loadAccount(container) {
  const u = store.getState().user;
  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Akun Saya</h1>
      <p class="page-subtitle">Profil publik, verifikasi, dan pengaturan akun</p>
    </div>

    <div class="card card-pad-lg" style="margin-bottom:1rem">
      <div class="flex gap-md" style="align-items:center">
        ${avatar(u, "xl")}
        <div style="flex:1">
          <div style="font-size:1.25rem; font-weight:700">${escape(u.name)}</div>
          <div class="text-sm text-muted">${escape(u.email)}</div>
          <div class="text-sm text-muted">${escape(u.city || "Lokasi belum diisi")}</div>
        </div>
        <div class="flex gap-sm">
          <a class="btn btn-secondary btn-sm" href="#/profile/${u.id}" data-testid="view-public-profile"><i class="fa-solid fa-arrow-up-right-from-square"></i> Lihat Profil Publik</a>
        </div>
      </div>
    </div>

    <div class="grid grid-3" style="gap:1rem">
      <a href="#/profile" class="card card-pad card-hover" data-testid="account-edit-profile" style="text-decoration:none; color:inherit">
        <div style="font-size:1.5rem; color:var(--primary)"><i class="fa-solid fa-user-pen"></i></div>
        <h3 style="margin:.5rem 0 .25rem">Edit Profil</h3>
        <div class="text-sm text-muted">Perbarui nama, bio, foto, kota & skill</div>
      </a>
      <a href="#/verification" class="card card-pad card-hover" data-testid="account-verification" style="text-decoration:none; color:inherit">
        <div style="font-size:1.5rem; color:var(--primary)"><i class="fa-solid fa-id-card"></i></div>
        <h3 style="margin:.5rem 0 .25rem">Verifikasi Akun</h3>
        <div class="text-sm text-muted">Verifikasi email, telepon & KTP untuk meningkatkan kepercayaan</div>
      </a>
      <a href="#/settings" class="card card-pad card-hover" data-testid="account-settings" style="text-decoration:none; color:inherit">
        <div style="font-size:1.5rem; color:var(--primary)"><i class="fa-solid fa-gear"></i></div>
        <h3 style="margin:.5rem 0 .25rem">Pengaturan</h3>
        <div class="text-sm text-muted">Password, keamanan, dan preferensi notifikasi</div>
      </a>
    </div>
  `;
}

// ==================== LOAD BUYER JOBS ====================
async function loadBuyerJobs(container, opts = {}) {
  const u = store.getState().user;

  container.innerHTML = `
    <div class="page-header"><div class="flex-between"><h1 class="page-title">Kelola Lowongan</h1>
      <button class="btn btn-primary" id="dash-post-job-btn" data-testid="dash-post-job"><i class="fa-solid fa-plus"></i> Pasang Lowongan</button>
    </div></div>
    <div id="jobs-list" class="flex-col"></div>
    <div id="job-form-container" style="display:none; margin-top:24px;"></div>
  `;

  const listEl = container.querySelector("#jobs-list");
  const formContainer = container.querySelector("#job-form-container");
  const addBtn = container.querySelector("#dash-post-job-btn");
  let isFormVisible = false;

  const closeForm = () => {
    if (formContainer) {
      formContainer.style.display = "none";
      formContainer.innerHTML = "";
    }
    if (listEl) listEl.style.display = "";
    if (addBtn) addBtn.style.display = "";
    isFormVisible = false;
    if (location.hash.includes("/dashboard/manage-jobs/")) {
      history.replaceState(null, "", "#/dashboard/manage-jobs");
    }
  };

  const openJobForm = async (mode = "create", existingId = null) => {
    if (isFormVisible) return;
    const cats = await api.get("/categories");
    let existing = null;
    if (mode === "edit" && existingId) {
      try { existing = await api.get(`/jobs/${existingId}`); } catch (_) {
        toast("Lowongan tidak ditemukan", "error");
        return;
      }
    }
    const today = new Date().toISOString().split("T")[0];
    const deadlineISO = existing?.deadline ? new Date(existing.deadline).toISOString().split("T")[0] : "";

    formContainer.innerHTML = `
      <div class="card card-pad-lg" style="background:#fff;">
        <div class="flex-between" style="margin-bottom:20px;">
          <h3 style="margin:0;"><i class="fa-solid ${mode === "edit" ? "fa-pen" : "fa-plus-circle"}"></i> ${mode === "edit" ? "Edit Lowongan" : "Pasang Lowongan Baru"}</h3>
          <button class="btn btn-ghost btn-sm" id="close-job-form" data-testid="close-job-form"><i class="fa-solid fa-xmark"></i> Batal</button>
        </div>
        <form id="job-form" data-testid="dash-job-form">
          <div class="form-group"><label class="label">Judul Lowongan *</label><input class="input" id="j-title" required minlength="5" value="${escape(existing?.title || "")}" placeholder="Contoh: Desainer Grafis untuk Brosur" data-testid="dash-job-title"></div>
          <div class="form-group"><label class="label">Kategori *</label>
            <select class="select" id="j-category" required data-testid="dash-job-category">
              <option value="">Pilih Kategori</option>
              ${cats.map((c) => `<option value="${c.id}" ${existing?.categoryId === c.id ? "selected" : ""}>${escape(c.name)}</option>`).join("")}
            </select>
          </div>
          <div class="form-group"><label class="label">Deskripsi Lengkap *</label><textarea class="textarea" id="j-desc" rows="5" required minlength="20" placeholder="Jelaskan kebutuhan, deliverable, dan ekspektasi…" data-testid="dash-job-desc">${escape(existing?.description || "")}</textarea></div>
          <div class="grid grid-2">
            <div class="form-group"><label class="label">Budget (Rp) *</label><input class="input" id="j-budget" type="number" required min="10000" step="1000" value="${existing?.budget || ""}" placeholder="500000" data-testid="dash-job-budget"></div>
            <div class="form-group"><label class="label">Deadline</label><input class="input" id="j-deadline" type="date" min="${today}" value="${deadlineISO}" data-testid="dash-job-deadline"></div>
          </div>
          <div class="form-group"><label class="label">Lokasi</label><input class="input" id="j-loc" value="${escape(existing?.location || "Remote")}" placeholder="Remote / Jakarta / Surabaya" data-testid="dash-job-loc"></div>
          <div style="display:flex; gap:12px; justify-content:flex-end; margin-top:24px;">
            <button type="button" class="btn btn-secondary" id="cancel-job-form">Batal</button>
            <button class="btn btn-primary" type="submit" data-testid="dash-job-submit"><i class="fa-solid fa-paper-plane"></i> ${mode === "edit" ? "Update Lowongan" : "Pasang Sekarang"}</button>
          </div>
        </form>
      </div>
    `;
    formContainer.style.display = "block";
    if (listEl) listEl.style.display = "none";
    if (addBtn) addBtn.style.display = "none";
    isFormVisible = true;

    formContainer.querySelector("#close-job-form")?.addEventListener("click", closeForm);
    formContainer.querySelector("#cancel-job-form")?.addEventListener("click", closeForm);

    formContainer.querySelector("#job-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = formContainer.querySelector("#j-title").value.trim();
      const categoryId = formContainer.querySelector("#j-category").value;
      const description = formContainer.querySelector("#j-desc").value.trim();
      const budget = parseFloat(formContainer.querySelector("#j-budget").value);
      const deadline = formContainer.querySelector("#j-deadline").value || null;
      const location = formContainer.querySelector("#j-loc").value.trim() || "Remote";

      if (title.length < 5) return toast("Judul minimal 5 karakter", "error");
      if (!categoryId) return toast("Pilih kategori", "error");
      if (description.length < 20) return toast("Deskripsi minimal 20 karakter", "error");
      if (!budget || budget < 10000) return toast("Budget minimal Rp 10.000", "error");

      const submitBtn = formContainer.querySelector("[type=submit]");
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan…';

      try {
        const payload = { title, categoryId, description, budget, location, isOnline: location.toLowerCase() === "remote", deadline };
        if (mode === "edit" && existingId) {
          await api.put(`/jobs/${existingId}`, payload);
          toast("Lowongan diperbarui", "success");
        } else {
          await api.post("/jobs", payload);
          toast("Lowongan terpasang", "success");
        }
        closeForm();
        await reloadList();
      } catch (err) {
        toast(err.message || "Gagal menyimpan lowongan", "error");
        submitBtn.disabled = false;
        submitBtn.innerHTML = mode === "edit" ? "Update Lowongan" : "Pasang Sekarang";
      }
    });
  };

  const reloadList = async () => {
    try {
      const jr = await api.get("/jobs?buyerId=" + u.id);
      const j = Array.isArray(jr) ? jr : jr.data || [];
      listEl.innerHTML = j.length
        ? j.map((x) => `
          <div class="card card-pad" data-testid="job-${x.id}">
            <div class="flex-between">
              <div style="flex:1; min-width:0;">
                <div class="flex gap-sm mb-1">${statusPill(x.status)}<span class="text-xs text-muted">${x.createdAt ? new Date(x.createdAt).toLocaleDateString("id-ID") : ""}</span></div>
                <h3 style="margin:0">${escape(x.title)}</h3>
                <div class="text-sm text-muted">${escape(typeof x.category === "object" ? x.category?.name : x.category || "")} · ${fmtIDR(x.budget)}</div>
              </div>
            </div>
            <div class="flex gap-sm mt-2">
              <a class="btn btn-secondary btn-sm" href="#/jobs/${x.id}" data-testid="view-job-${x.id}"><i class="fa-solid fa-eye"></i> Lihat (${x.applicationsCount || x.applicationCount || 0} pelamar)</a>
              <a class="btn btn-ghost btn-sm" href="#/dashboard/manage-jobs/edit/${x.id}" data-testid="edit-job-${x.id}"><i class="fa-solid fa-pen"></i> Edit</a>
              <button class="btn btn-danger btn-sm" data-del-job="${x.id}" data-testid="del-job-${x.id}"><i class="fa-solid fa-trash"></i> Hapus</button>
            </div>
          </div>`).join("")
        : empty("Belum ada lowongan", "Buat lowongan baru dan tunggu lamaran dari freelancer.", "fa-folder-open");

      listEl.querySelectorAll("[data-del-job]").forEach((b) =>
        b.addEventListener("click", () =>
          confirmModal("Hapus lowongan ini? Lamaran terkait akan ikut hilang.", async () => {
            try {
              await api.del("/jobs/" + b.dataset.delJob);
              toast("Lowongan dihapus", "success");
              await reloadList();
            } catch (err) { toast(err.message, "error"); }
          })),
      );
    } catch (e) {
      listEl.innerHTML = empty("Gagal memuat", e.message);
    }
  };

  if (addBtn) {
    addBtn.addEventListener("click", (e) => {
      e.preventDefault();
      history.pushState(null, "", "#/dashboard/manage-jobs/new");
      openJobForm("create");
    });
  }

  await reloadList();

  // Auto-open form when sub-route matches
  if (opts.openForm === "create") {
    await openJobForm("create");
  } else if (opts.openForm === "edit" && opts.id) {
    await openJobForm("edit", opts.id);
  }
}

// ==================== LOAD SELLER SERVICES (DIPERBAIKI) ====================
// ==================== LOAD SELLER SERVICES (FIXED) ====================
async function loadSellerServices(container, opts = {}) {
  const u = store.getState().user;

  // Render directly into the live container so event listeners are preserved.
  container.innerHTML = `
    <div class="page-header"><div class="flex-between"><h1 class="page-title">Kelola Jasa</h1><button class="btn btn-primary" id="add-svc" data-testid="add-service-btn"><i class="fa-solid fa-plus"></i> Tambah Jasa</button></div></div>
    <div id="svc-list" class="grid grid-3"></div>
    <div id="service-form-container" style="display:none; margin-top:24px;"></div>
  `;

  const svcListContainer = container.querySelector("#svc-list");
  const formContainer = container.querySelector("#service-form-container");
  const addBtn = container.querySelector("#add-svc");

  let isFormVisible = false;

  const closeForm = () => {
    if (formContainer) {
      formContainer.style.display = "none";
      formContainer.innerHTML = "";
    }
    if (svcListContainer) svcListContainer.style.display = "grid";
    if (addBtn) addBtn.style.display = "";
    isFormVisible = false;
    if (location.hash.includes("/dashboard/manage-services/")) {
      history.replaceState(null, "", "#/dashboard/manage-services");
    }
  };

  const showEditServiceForm = async (serviceId, currentData) => {
    const cats = await api.get("/categories");

    formContainer.innerHTML = `
      <div class="card card-pad-lg" style="background:#fff; border-radius:20px; padding:24px;">
        <div class="flex-between" style="margin-bottom:20px;">
          <h3 style="margin:0"><i class="fa-solid fa-pen"></i> Edit Jasa</h3>
          <button class="btn btn-ghost btn-sm" id="close-service-form" data-testid="close-edit-service"><i class="fa-solid fa-xmark"></i> Batal</button>
        </div>
        <form id="service-form">
          <div class="form-group"><label class="label">Judul Jasa *</label><input class="input" id="title" required value="${escape(currentData.title || "")}" data-testid="edit-svc-title"></div>
          <div class="form-group"><label class="label">Kategori *</label>
            <select class="select" id="categoryId" required data-testid="edit-svc-category">
              <option value="">Pilih Kategori</option>
              ${cats.map((c) => `<option value="${c.id}" ${currentData.categoryId === c.id ? "selected" : ""}>${escape(c.name)}</option>`).join("")}
            </select>
          </div>
          <div class="form-group"><label class="label">Deskripsi *</label><textarea class="textarea" id="description" rows="5" required data-testid="edit-svc-desc">${escape(currentData.description || "")}</textarea></div>
          <div class="grid grid-2">
            <div class="form-group"><label class="label">Harga (Rp) *</label><input class="input" id="price" type="number" required min="10000" value="${currentData.price || ""}" data-testid="edit-svc-price"></div>
            <div class="form-group"><label class="label">Hari Pengerjaan *</label><input class="input" id="deliveryTime" type="number" required min="1" max="30" value="${currentData.deliveryTime || ""}" data-testid="edit-svc-days"></div>
          </div>
          <div class="form-group">
            <label class="label">Gambar Cover</label>
            <div style="border:2px dashed #ddd; border-radius:16px; padding:20px; text-align:center; cursor:pointer;" id="upload-zone">
              <i class="fa-solid fa-cloud-upload-alt" style="font-size:2rem;"></i>
              <p>Klik untuk upload gambar baru</p>
              <input type="file" id="imageFile" accept="image/*" style="display:none;">
              <input type="hidden" id="imageUrl" value="${currentData.image || ""}">
            </div>
            <div id="image-preview" style="margin-top:12px;${currentData.image ? "" : "display:none"}">
              <img id="preview-img" src="${currentData.image || ""}" style="max-width:100%; max-height:150px; border-radius:12px;">
              <button type="button" id="remove-image" class="btn btn-sm btn-ghost" style="margin-top:8px;"><i class="fa-solid fa-trash"></i> Hapus gambar</button>
            </div>
          </div>
          <div style="display:flex; gap:12px; justify-content:flex-end;">
            <button type="button" class="btn btn-secondary" id="cancel-service-form">Batal</button>
            <button class="btn btn-primary" type="submit" data-testid="submit-edit-service">Update Jasa</button>
          </div>
        </form>
      </div>
    `;

    formContainer.style.display = "block";
    svcListContainer.style.display = "none";
    if (addBtn) addBtn.style.display = "none";
    isFormVisible = true;

    setupImageUpload();

    const serviceForm = formContainer.querySelector("#service-form");
    formContainer.querySelector("#cancel-service-form")?.addEventListener("click", closeForm);
    formContainer.querySelector("#close-service-form")?.addEventListener("click", closeForm);

    serviceForm?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = formContainer.querySelector("#title")?.value.trim();
      const categoryId = formContainer.querySelector("#categoryId")?.value;
      const description = formContainer.querySelector("#description")?.value.trim();
      const price = parseFloat(formContainer.querySelector("#price")?.value);
      const deliveryTime = parseInt(formContainer.querySelector("#deliveryTime")?.value);
      const image =
        formContainer.querySelector("#imageUrl")?.value.trim() ||
        currentData.image ||
        "https://placehold.co/600x400/0a66c2/ffffff?text=No+Image";

      if (!title || title.length < 5) return toast("Judul minimal 5 karakter", "error");
      if (!categoryId) return toast("Pilih kategori", "error");
      if (!description || description.length < 20) return toast("Deskripsi minimal 20 karakter", "error");
      if (!price || isNaN(price) || price < 10000) return toast("Harga minimal Rp 10.000", "error");
      if (!deliveryTime || isNaN(deliveryTime) || deliveryTime < 1 || deliveryTime > 30)
        return toast("Hari pengerjaan harus 1-30 hari", "error");

      const submitBtn = serviceForm.querySelector("[type=submit]");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengupdate...';
      }

      try {
        await api.put(`/services/${serviceId}`, {
          title, categoryId, description, price, deliveryTime, images: [image],
        });
        toast("Jasa berhasil diupdate", "success");
        closeForm();
        await load();
      } catch (err) {
        toast(err.message || "Gagal mengupdate jasa", "error");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = "Update Jasa";
        }
      }
    });
  };

  const showCreateServiceForm = async () => {
    if (isFormVisible) {
      closeForm();
      return;
    }

    const cats = await api.get("/categories");

    formContainer.innerHTML = `
      <div class="card card-pad-lg" style="background:#fff; border-radius:20px; padding:24px;">
        <div class="flex-between" style="margin-bottom:20px;">
          <h3 style="margin:0"><i class="fa-solid fa-plus-circle"></i> Buat Jasa Baru</h3>
          <button class="btn btn-ghost btn-sm" id="close-service-form" data-testid="close-create-service"><i class="fa-solid fa-xmark"></i> Batal</button>
        </div>
        <form id="service-form">
          <div class="form-group"><label class="label">Judul Jasa *</label><input class="input" id="title" required placeholder="Contoh: Desain Logo Profesional" data-testid="create-svc-title"></div>
          <div class="form-group"><label class="label">Kategori *</label>
            <select class="select" id="categoryId" required data-testid="create-svc-category">
              <option value="">Pilih Kategori</option>
              ${cats.map((c) => `<option value="${c.id}">${escape(c.name)}</option>`).join("")}
            </select>
          </div>
          <div class="form-group"><label class="label">Deskripsi Jasa *</label><textarea class="textarea" id="description" rows="5" required placeholder="Jelaskan detail jasa yang Anda tawarkan..." data-testid="create-svc-desc"></textarea></div>
          <div class="grid grid-2">
            <div class="form-group"><label class="label">Harga (Rp) *</label><input class="input" id="price" type="number" required min="10000" placeholder="150000" data-testid="create-svc-price"></div>
            <div class="form-group"><label class="label">Hari Pengerjaan *</label><input class="input" id="deliveryTime" type="number" required min="1" max="30" placeholder="3" data-testid="create-svc-days"></div>
          </div>
          <div class="form-group">
            <label class="label">Gambar Cover</label>
            <div style="border:2px dashed #ddd; border-radius:16px; padding:20px; text-align:center; cursor:pointer;" id="upload-zone">
              <i class="fa-solid fa-cloud-upload-alt" style="font-size:2rem;"></i>
              <p>Klik untuk upload gambar</p>
              <input type="file" id="imageFile" accept="image/*" style="display:none;">
              <input type="hidden" id="imageUrl">
            </div>
            <div id="image-preview" style="display:none; margin-top:12px;">
              <img id="preview-img" src="" style="max-width:100%; max-height:150px; border-radius:12px;">
              <button type="button" id="remove-image" class="btn btn-sm btn-ghost" style="margin-top:8px;"><i class="fa-solid fa-trash"></i> Hapus</button>
            </div>
          </div>
          <div style="display:flex; gap:12px; justify-content:flex-end;">
            <button type="button" class="btn btn-secondary" id="cancel-service-form">Batal</button>
            <button class="btn btn-primary" type="submit" data-testid="submit-create-service">Simpan Jasa</button>
          </div>
        </form>
      </div>
    `;

    formContainer.style.display = "block";
    svcListContainer.style.display = "none";
    if (addBtn) addBtn.style.display = "none";
    isFormVisible = true;

    setupImageUpload();

    const serviceForm = formContainer.querySelector("#service-form");
    formContainer.querySelector("#cancel-service-form")?.addEventListener("click", closeForm);
    formContainer.querySelector("#close-service-form")?.addEventListener("click", closeForm);

    serviceForm?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = formContainer.querySelector("#title")?.value.trim();
      const categoryId = formContainer.querySelector("#categoryId")?.value;
      const description = formContainer.querySelector("#description")?.value.trim();
      const price = parseFloat(formContainer.querySelector("#price")?.value);
      const deliveryTime = parseInt(formContainer.querySelector("#deliveryTime")?.value);
      const image =
        formContainer.querySelector("#imageUrl")?.value.trim() ||
        "https://placehold.co/600x400/0a66c2/ffffff?text=No+Image";

      if (!title || title.length < 5) return toast("Judul minimal 5 karakter", "error");
      if (!categoryId) return toast("Pilih kategori", "error");
      if (!description || description.length < 20) return toast("Deskripsi minimal 20 karakter", "error");
      if (!price || isNaN(price) || price < 10000) return toast("Harga minimal Rp 10.000", "error");
      if (!deliveryTime || isNaN(deliveryTime) || deliveryTime < 1 || deliveryTime > 30)
        return toast("Hari pengerjaan harus 1-30 hari", "error");

      const submitBtn = serviceForm.querySelector("[type=submit]");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
      }

      try {
        await api.post("/services", {
          title, categoryId, description, price, deliveryTime, images: [image],
        });
        toast("Jasa berhasil dibuat", "success");
        closeForm();
        await load();
      } catch (err) {
        toast(err.message || "Gagal membuat jasa", "error");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = "Simpan Jasa";
        }
      }
    });
  };

  const load = async () => {
    try {
      const svcsResp = await api.get("/services?sellerId=" + u.id);
      const svcs = Array.isArray(svcsResp) ? svcsResp : svcsResp.data || [];
      svcListContainer.innerHTML = svcs.length
        ? svcs.map((s) => `
          <div class="service-card" data-testid="service-card-${s.id}" style="background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <div class="thumb" style="height:160px;"><img src="${s.image || s.images?.[0] || "https://placehold.co/400x200/0a66c2/fff?text=No+Image"}" style="width:100%; height:100%; object-fit:cover;"></div>
            <div class="body" style="padding:12px;">
              <div class="title" style="font-weight:600;">${escape(s.title)}</div>
              <div class="meta" style="display:flex; justify-content:space-between; margin:8px 0;">
                <span class="price" style="font-weight:700; color:#0a66c2;">${fmtIDR(s.price)}</span>
                <span>${s.isActive !== false ? '<span class="badge badge-success">Aktif</span>' : '<span class="badge">Nonaktif</span>'}</span>
              </div>
              <div class="flex gap-sm">
                <button class="btn btn-secondary btn-sm" data-edit="${s.id}" data-testid="edit-svc-${s.id}">Edit</button>
                <button class="btn btn-ghost btn-sm" data-toggle="${s.id}" data-testid="toggle-svc-${s.id}">${s.isActive !== false ? "Nonaktifkan" : "Aktifkan"}</button>
                <button class="btn btn-danger btn-sm" data-del="${s.id}" data-testid="delete-svc-${s.id}">Hapus</button>
              </div>
            </div>
          </div>
        `).join("")
        : empty("Belum ada jasa", "Klik 'Tambah Jasa' untuk memulai", "fa-box");

      svcListContainer.querySelectorAll("[data-del]").forEach((b) =>
        b.addEventListener("click", () =>
          confirmModal("Hapus jasa ini?", async () => {
            try {
              await api.del("/services/" + b.dataset.del);
              toast("Jasa dihapus", "success");
              await load();
            } catch (err) {
              toast(err.message, "error");
            }
          }),
        ),
      );

      svcListContainer.querySelectorAll("[data-toggle]").forEach((b) =>
        b.addEventListener("click", async () => {
          try {
            await api.post("/services/" + b.dataset.toggle + "/toggle-active");
            toast("Status jasa berubah", "success");
            await load();
          } catch (err) {
            toast(err.message, "error");
          }
        }),
      );

      svcListContainer.querySelectorAll("[data-edit]").forEach((b) =>
        b.addEventListener("click", async () => {
          try {
            const service = await api.get("/services/" + b.dataset.edit);
            history.pushState(null, "", "#/dashboard/manage-services/edit/" + b.dataset.edit);
            await showEditServiceForm(b.dataset.edit, service);
          } catch (err) {
            toast("Gagal memuat data jasa", "error");
          }
        }),
      );
    } catch (e) {
      svcListContainer.innerHTML = empty("Gagal memuat", e.message);
    }
  };

  // Add service button - attached directly to live DOM (listeners preserved)
  if (addBtn) {
    addBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      history.pushState(null, "", "#/dashboard/manage-services/new");
      showCreateServiceForm();
    });
  }

  await load();

  // Auto-open form when sub-route says so
  if (opts.openForm === "create") {
    await showCreateServiceForm();
  } else if (opts.openForm === "edit" && opts.id) {
    try {
      const svc = await api.get("/services/" + opts.id);
      await showEditServiceForm(opts.id, svc);
    } catch (err) {
      toast("Gagal memuat data jasa", "error");
    }
  }
}


// frontend/src/features/dashboard/DashboardPages.js

// Ganti DashboardOverview dengan ini:
// frontend/src/features/dashboard/DashboardPages.js

// ... semua import dan fungsi helper tetap sama sampai sebelum DashboardOverview ...

// ==================== DASHBOARD OVERVIEW (HANYA SATU) ====================

export async function DashboardOverview({ mount }) {
  // Always re-read section from URL hash — never rely on stale state
  let activeSection = "overview";
  const hashMatch = location.hash.match(/\/dashboard(?:\/([^/?]+))?(?:\/([^?]+))?/);
  if (hashMatch && hashMatch[1]) {
    activeSection = hashMatch[1];
  }

  mount.innerHTML = `<div class="container page"><div class="dash-wrap">${sidebar(activeSection)}<section class="dash-main"><div class="spinner"></div></section></div></div>`;
  dashboardContentContainer = mount.querySelector("section");
  await loadDashboardContent(activeSection, mount);
}

// Export untuk kompatibilitas router
export async function BuyerOrders({ mount }) {
  mount.innerHTML = `<div class="container page"><div class="dash-wrap">${sidebar("transactions")}<section><div class="spinner"></div></section></div></div>`;
  await loadTransactions(mount.querySelector("section"));
}

export async function BuyerJobs({ mount }) {
  mount.innerHTML = `<div class="container page"><div class="dash-wrap">${sidebar("manage-jobs")}<section><div class="spinner"></div></section></div></div>`;
  await loadManageJobs(mount.querySelector("section"));
}

export async function BuyerFavorites({ mount }) {
  mount.innerHTML = `<div class="container page"><div class="dash-wrap">${sidebar("favorites")}<section><div class="spinner"></div></section></div></div>`;
  await loadFavorites(mount.querySelector("section"));
}

export async function SellerServices({ mount }) {
  mount.innerHTML = `<div class="container page"><div class="dash-wrap">${sidebar("manage-services")}<section><div class="spinner"></div></section></div></div>`;
  await loadManageServices(mount.querySelector("section"));
}

export async function SellerOrders({ mount }) {
  mount.innerHTML = `<div class="container page"><div class="dash-wrap">${sidebar("transactions")}<section><div class="spinner"></div></section></div></div>`;
  await loadTransactions(mount.querySelector("section"));
}

export async function SellerEarnings({ mount }) {
  mount.innerHTML = `<div class="container page"><div class="dash-wrap">${sidebar("earnings")}<section><div class="spinner"></div></section></div></div>`;
  await loadEarnings(mount.querySelector("section"));
}

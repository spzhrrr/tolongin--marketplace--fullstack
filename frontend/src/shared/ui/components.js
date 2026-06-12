// frontend/src/shared/ui/components.js

import { escape, fmtIDR } from "../utils/helpers.js";

export function loading() {
  return '<div class="spinner" data-testid="loading-spinner"></div>';
}

export function empty(title, sub, icon = "fa-folder-open", cta) {
  return `<div class="empty" data-testid="empty-state">
    <i class="fa-solid ${icon}"></i>
    <h3>${escape(title)}</h3>
    <p>${escape(sub || "")}</p>
    ${cta ? cta : ""}
  </div>`;
}

export function avatar(user, size = "") {
  if (!user) {
    user = { name: "User", id: "default" };
  }

  const cls =
    size === "sm"
      ? "avatar avatar-sm"
      : size === "lg"
        ? "avatar avatar-lg"
        : size === "xl"
          ? "avatar avatar-xl"
          : "avatar";

  let avatarUrl = `https://i.pravatar.cc/200?u=${encodeURIComponent(user.id || user.email || "default")}`;

  if (
    user.avatar &&
    typeof user.avatar === "string" &&
    user.avatar !== "null" &&
    user.avatar !== "undefined" &&
    user.avatar.trim() !== ""
  ) {
    avatarUrl = user.avatar.trim();
  }

  const userName = user.name ? user.name : "User";
  const fallback = `https://i.pravatar.cc/200?u=${encodeURIComponent(user.id || user.email || "fallback")}`;

  // onerror only fires once thanks to onerror=null; this avoids infinite loops
  // when the fallback URL itself fails to load.
  return `<img class="${cls}" src="${avatarUrl}" alt="${escape(userName)}" loading="lazy" onerror="this.onerror=null;this.src='${fallback}'" />`;
}

export function statusPill(status) {
  if (!status) status = "unknown";
  const statusMap = {
    OPEN: "status-open",
    IN_PROGRESS: "status-in_progress",
    COMPLETED: "status-completed",
    CANCELLED: "status-cancelled",
    PENDING: "status-pending",
    ACCEPTED: "status-accepted",
    REJECTED: "status-rejected",
    RESOLVED: "status-resolved",
    WAITING_CONFIRMATION: "status-pending",
    IN_REVIEW: "status-in_progress",
    REVISION_REQUESTED: "status-pending",
    DISPUTED: "status-rejected",
  };
  // Label dalam Bahasa Indonesia untuk semua status
  const labelMap = {
    OPEN: "Dibuka",
    IN_PROGRESS: "Dikerjakan",
    COMPLETED: "Selesai",
    CANCELLED: "Dibatalkan",
    PENDING: "Menunggu",
    ACCEPTED: "Diterima",
    REJECTED: "Ditolak",
    RESOLVED: "Selesai",
    WAITING_CONFIRMATION: "Menunggu Konfirmasi",
    IN_REVIEW: "Ditinjau",
    REVISION_REQUESTED: "Minta Revisi",
    DISPUTED: "Sengketa",
    CLOSED: "Ditutup",
  };
  const key = String(status).toUpperCase();
  const statusClass = statusMap[key] || "status-pending";
  const label = labelMap[key] || String(status).replace(/_/g, " ").toLowerCase();
  return `<span class="status-pill ${statusClass}" data-testid="status-pill">${escape(label)}</span>`;
}

export function stars(rating) {
  const r = Math.round(Number(rating) || 0);
  let out = '<span class="stars">';
  for (let i = 1; i <= 5; i++) {
    out += `<i class="fa-${i <= r ? "solid" : "regular"} fa-star"></i>`;
  }
  out += "</span>";
  return out;
}

export function serviceCard(s, opts = {}) {
  if (!s) return "";

  const seller = s.seller || {};

  let img = "";
  if (s.images) {
    try {
      const images =
        typeof s.images === "string" ? JSON.parse(s.images) : s.images;
      img = Array.isArray(images) && images.length > 0 ? images[0] : "";
    } catch (e) {
      img = "";
    }
  }

  if (!img || img === "null" || img === "undefined") {
    const titleSlug = (s.title || "Service").slice(0, 20);
    img = `https://placehold.co/600x400/0a66c2/ffffff?text=${encodeURIComponent(titleSlug)}`;
  }

  const sellerName = seller.name || "Penjual";
  const sellerVerified = seller.verified === true;
  const sellerId = seller.id || s.sellerId || null;

  const rating =
    typeof s.rating === "number" && !isNaN(s.rating) ? s.rating : 0;
  const reviewCount =
    typeof s.reviewCount === "number" && !isNaN(s.reviewCount)
      ? s.reviewCount
      : 0;
  const price = typeof s.price === "number" && !isNaN(s.price) ? s.price : 0;
  const title = s.title || "Untitled";
  const serviceId = s.id || "unknown";

  // ✅ PERBAIKAN: href menggunakan /services/ (plural) sesuai route di router.js
  return `<a class="service-card" href="#/services/${serviceId}" data-testid="service-card-${serviceId}">
    <div class="thumb">
      <img src="${img}" alt="${escape(title)}" loading="lazy" onerror="this.onerror=null;this.src='https://placehold.co/600x400/0a66c2/ffffff?text=No+Image'" />
      <button class="fav-btn ${opts.favorited ? "active" : ""}" data-fav="${serviceId}" data-testid="fav-btn-${serviceId}" aria-label="favorite">
        <i class="fa-${opts.favorited ? "solid" : "regular"} fa-heart"></i>
      </button>
    </div>
    <div class="body">
      <div class="seller">
        ${avatar(seller, "sm")}
        ${sellerId ? `<span class="seller-link" data-user-id="${sellerId}" data-testid="seller-link-${sellerId}" style="cursor:pointer;color:var(--text-2)">${escape(sellerName)}</span>` : `<span>${escape(sellerName)}</span>`}
        ${sellerVerified ? '<i class="fa-solid fa-circle-check" style="color:var(--primary)" title="Verified"></i>' : ""}
      </div>
      <div class="title">${escape(title)}</div>
      <div class="meta">
        <div class="rating"><i class="fa-solid fa-star" style="color:var(--warning)"></i> ${rating.toFixed(1)} <span class="text-muted">(${reviewCount})</span></div>
        <div class="price">${fmtIDR(price)}</div>
      </div>
    </div>
  </a>`;
}

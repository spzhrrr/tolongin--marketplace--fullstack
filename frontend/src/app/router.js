// frontend/src/app/router.js

import { store } from "./store.js";
import { escape } from "../shared/utils/helpers.js";
import { HomePage } from "../features/home/HomePage.js";
import {
  MarketplacePage,
  ServiceDetailPage,
} from "../features/marketplace/MarketplacePages.js";
import {
  JobsPage,
  PostJobPage,
  JobDetailPage,
} from "../features/jobs/JobsPages.js";
import { PostServicePage } from "../features/marketplace/PostServicePage.js";
import {
  OrdersListPage,
  OrderDetailPage,
} from "../features/orders/OrdersPages.js";
import { ChatPage } from "../features/chat/ChatPages.js";
import {
  DashboardOverview,
  BuyerOrders,
  BuyerJobs,
  BuyerFavorites,
  SellerServices,
  SellerOrders,
  SellerEarnings,
} from "../features/dashboard/DashboardPages.js";
import { PublicProfilePage } from "../features/profile/PublicProfilePage.js";
import { ProfilePage, SettingsPage } from "../features/profile/ProfilePages.js";
import { VerificationPage } from "../features/verification/VerificationPage.js";
import { NotificationsPage } from "../features/notifications/NotificationsPage.js";
import { LoginPage } from "../features/auth/pages/LoginPage.js";
import {
  RegisterPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  VerifyEmailPage,
} from "../features/auth/pages/AuthPages.js";
import { KycPage } from "../features/profile/KycPage.js";
import {
  AdminDashboard,
  VerifySellers,
  ManageUsers,
  ManageServices,
  ManageJobs,
  ManageDisputes,
  PlatformSettings,
  ActivityLog,
  ManageKyc,
} from "../features/admin/AdminPages.js";
import { NotFoundPage } from "../app/App.js";

const routes = [];
let notFound = null;
let mountEl = null;
let currentCleanup = null;

// ============ HELPER FUNCTIONS (harus didefinisikan SEBELUM digunakan) ============

function pathToRegex(path) {
  return new RegExp("^" + path.replace(/:[^/]+/g, "([^/]+)") + "$");
}

function extractKeys(path) {
  return [...path.matchAll(/:([^/]+)/g)].map((m) => m[1]);
}

function paramsFrom(match, keys) {
  const o = {};
  keys.forEach((k, i) => (o[k] = decodeURIComponent(match[i + 1])));
  return o;
}

function findMatch(pathname) {
  for (const r of routes) {
    const m = pathname.match(r.regex);
    if (m) return { r, params: paramsFrom(m, r.keys) };
  }
  return null;
}

function runCleanup() {
  if (!currentCleanup) return;
  try {
    currentCleanup();
  } catch (err) {
    if (import.meta.env.DEV) console.warn("[router] cleanup failed", err);
  }
  currentCleanup = null;
}

function renderNotFound() {
  mountEl.innerHTML = "";
  if (notFound) notFound(mountEl);
  window.scrollTo(0, 0);
}

function emitToast(type, text) {
  window.dispatchEvent(new CustomEvent("toast", { detail: { type, text } }));
}

function checkGuards(r) {
  if (r.opts.auth && !store.getState().token) {
    emitToast("warning", "Silakan login terlebih dahulu");
    router.navigate("/login");
    return false;
  }
  if (r.opts.role) {
    const u = store.getState().user;
    const allowed = Array.isArray(r.opts.role) ? r.opts.role : [r.opts.role];
    if (!u || !allowed.includes(u.role)) {
      emitToast("error", "Anda tidak memiliki akses ke halaman ini");
      router.navigate("/");
      return false;
    }
  }
  return true;
}

async function runHandler(r, handler, params, query, pathname) {
  mountEl.innerHTML =
    '<div class="container app-fade-in"><div class="spinner"></div></div>';
  try {
    const cleanup = await handler({ params, query, mount: mountEl });
    if (typeof cleanup === "function") currentCleanup = cleanup;
  } catch (e) {
    console.error("Handler error:", e);
    mountEl.innerHTML = `<div class="container"><div class="empty"><i class="fa-solid fa-triangle-exclamation"></i><h3>Gagal memuat halaman</h3><p>${escape(e.message)}</p><a href="#/" class="btn btn-primary mt-2">Kembali ke Beranda</a></div></div>`;
  }
  window.scrollTo(0, 0);
  window.dispatchEvent(
    new CustomEvent("route-change", { detail: { path: pathname } }),
  );
}

// ============ ROUTER OBJECT ============

export const router = {
  add(path, handler, opts = {}) {
    routes.push({
      path,
      handler,
      opts,
      regex: pathToRegex(path),
      keys: extractKeys(path),
    });
    return this;
  },
  setNotFound(fn) {
    notFound = fn;
    return this;
  },
  mount(el) {
    mountEl = el;
    window.addEventListener("hashchange", () => this.render());
    this.render();
  },
  navigate(to) {
    let normalizedTo = to;
    if (normalizedTo !== "/" && normalizedTo.endsWith("/")) {
      normalizedTo = normalizedTo.slice(0, -1);
    }
    if (location.hash === `#${normalizedTo}`) {
      this.render();
      return;
    }
    location.hash = `#${normalizedTo}`;
  },
  current() {
    let path = location.hash.replace(/^#/, "") || "/";
    if (path !== "/" && path.endsWith("/")) {
      path = path.slice(0, -1);
    }
    return path;
  },
  async render() {
    let path = this.current();
    const [pathname, qstr = ""] = path.split("?");
    const query = Object.fromEntries(new URLSearchParams(qstr));
    const match = findMatch(pathname);
    runCleanup();
    if (!match) return renderNotFound();
    if (!checkGuards(match.r)) return;

    await runHandler(match.r, match.r.handler, match.params, query, pathname);
  },
};

// ========== REGISTER ALL ROUTES ==========
routes.length = 0;

// Public routes (tanpa auth)
router.add("/", HomePage);
router.add("/marketplace", MarketplacePage);
router.add("/services/:id", ServiceDetailPage);
router.add("/jobs", JobsPage);
router.add("/jobs/:id", JobDetailPage);
router.add("/users/:id", PublicProfilePage);
router.add("/login", LoginPage);
router.add("/register", RegisterPage);
router.add("/forgot-password", ForgotPasswordPage);
router.add("/reset-password", ResetPasswordPage);

// Protected routes (perlu login)
router.add("/orders", OrdersListPage, { auth: true });
router.add("/orders/:id", OrderDetailPage, { auth: true });
router.add("/chat", ChatPage, { auth: true });
router.add("/chat/:id", ChatPage, { auth: true });

// Dashboard — semua sub-route diarahkan ke DashboardOverview yang
// membaca section langsung dari location.hash. Ini mencegah bug "dashboard
// nyangkut" ketika berpindah antar section setelah navigasi keluar/masuk.
router.add("/dashboard", DashboardOverview, { auth: true });
router.add("/dashboard/overview", DashboardOverview, { auth: true });
router.add("/dashboard/transactions", DashboardOverview, { auth: true });
router.add("/dashboard/manage-services", DashboardOverview, { auth: true });
router.add("/dashboard/manage-services/new", DashboardOverview, { auth: true });
router.add("/dashboard/manage-services/edit/:id", DashboardOverview, { auth: true });
router.add("/dashboard/manage-jobs", DashboardOverview, { auth: true });
router.add("/dashboard/manage-jobs/new", DashboardOverview, { auth: true });
router.add("/dashboard/manage-jobs/edit/:id", DashboardOverview, { auth: true });
router.add("/dashboard/my-applications", DashboardOverview, { auth: true });
router.add("/dashboard/favorites", DashboardOverview, { auth: true });
router.add("/dashboard/earnings", DashboardOverview, { auth: true });
router.add("/dashboard/account", DashboardOverview, { auth: true });

// Legacy public job/service posting URLs — redirect ke dashboard
router.add("/post-job", () => { location.hash = "#/dashboard/manage-jobs/new"; }, { auth: true });
router.add("/post-service", () => { location.hash = "#/dashboard/manage-services/new"; }, { auth: true });

// Legacy routes (keep for backward compatibility)
router.add("/dashboard/buyer/orders", DashboardOverview, { auth: true });
router.add("/dashboard/buyer/jobs", DashboardOverview, { auth: true });
router.add("/dashboard/buyer/favorites", DashboardOverview, { auth: true });
router.add("/dashboard/seller/services", DashboardOverview, { auth: true });
router.add("/dashboard/seller/orders", DashboardOverview, { auth: true });
router.add("/dashboard/seller/earnings", DashboardOverview, { auth: true });

// Profile routes
router.add("/profile", ProfilePage, { auth: true });
router.add("/profile/:id", PublicProfilePage);
router.add("/settings", SettingsPage, { auth: true });
router.add("/verification", VerificationPage, { auth: true });
router.add("/kyc", KycPage, { auth: true });
router.add("/notifications", NotificationsPage, { auth: true });
router.add("/verify-email", VerifyEmailPage);

// Admin routes (perlu role ADMIN)
router.add("/admin", AdminDashboard, { auth: true, role: "ADMIN" });
router.add("/admin/sellers", VerifySellers, { auth: true, role: "ADMIN" });
router.add("/admin/kyc", ManageKyc, { auth: true, role: "ADMIN" });
router.add("/admin/users", ManageUsers, { auth: true, role: "ADMIN" });
router.add("/admin/services", ManageServices, { auth: true, role: "ADMIN" });
router.add("/admin/jobs", ManageJobs, { auth: true, role: "ADMIN" });
router.add("/admin/disputes", ManageDisputes, { auth: true, role: "ADMIN" });
router.add("/admin/settings", PlatformSettings, { auth: true, role: "ADMIN" });
router.add("/admin/activity", ActivityLog, { auth: true, role: "ADMIN" });

// 404 handler
router.setNotFound(NotFoundPage);

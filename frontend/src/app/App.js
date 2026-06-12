// Main App entry: mounts the router (routes are pre-registered in router.js)
import { router } from "./router.js";
import { renderLayout } from "./layout.js";
import { store } from "./store.js";
import { api } from "../shared/utils/api.js";

/**
 * On boot, if we have a persisted user but no in-memory access token,
 * attempt one silent refresh via the httpOnly cookie before the first
 * authenticated request fires. Failure is silent: any guarded request
 * will redirect to /login.
 */
async function silentRefresh() {
  const s = store.getState();
  if (!s.user || s.token) return;
  try {
    const data = await api.post("/auth/refresh", {});
    if (data?.token)
      store.setState({ token: data.token, user: data.user || s.user });
  } catch (_) {
    store.setState({ token: null, refreshToken: null, user: null });
  }
}

// ========== NOT FOUND PAGE COMPONENT ==========
export function NotFoundPage(mount) {
  mount.innerHTML = `
    <div class="container page" style="text-align:center; padding:60px 20px;" data-testid="not-found-page">
      <i class="fa-solid fa-circle-exclamation" style="font-size:4rem; color:#ccc;"></i>
      <h1 style="margin:16px 0 8px;">404 — Halaman Tidak Ditemukan</h1>
      <p style="color:#666;">Maaf, halaman yang Anda cari tidak tersedia.</p>
      <a href="#/" class="btn btn-primary" style="display:inline-block; margin-top:20px;" data-testid="back-home-btn">Kembali ke Beranda</a>
    </div>
  `;
}

export async function bootstrap() {
  const root = document.getElementById("app");
  const mount = renderLayout(root);
  await silentRefresh();

  // Routes are registered in router.js (side-effect on import).
  // Just attach the not-found handler and mount the router.
  router.setNotFound(NotFoundPage).mount(mount);
}

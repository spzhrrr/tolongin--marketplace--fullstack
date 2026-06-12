// Simple pub/sub store with localStorage persistence (tokens kept OUT of persistence).
// - Access token: held only in-memory (JS variable); refreshed transparently via cookie.
// - Refresh token: backend stores it as httpOnly cookie `tolongin_rt` (path=/api/auth).
//   The frontend never reads or writes the refresh token directly.
// - User profile + UI prefs (lang/theme): safe to persist.
const STORAGE_KEY = "tolongin_state";

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    if (import.meta.env.DEV)
      console.warn("[store] failed to load persisted state", err);
  }
  return {};
}

function save(state) {
  // Only persist non-sensitive, small fields — never tokens or large blobs (avatar base64).
  const u = state.user;
  const slimUser = u
    ? {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        // Only persist avatar if it's a URL (not a giant base64 data: URI) — otherwise drop it
        // and let /auth/me rehydrate it on next load.
        avatar:
          typeof u.avatar === "string" && !u.avatar.startsWith("data:")
            ? u.avatar
            : null,
        verified: u.verified,
        emailVerified: u.emailVerified,
        phoneVerified: u.phoneVerified,
        ktpVerified: u.ktpVerified,
        bio: u.bio,
        city: u.city,
        rating: u.rating,
        reviewCount: u.reviewCount,
        completedOrders: u.completedOrders,
      }
    : null;
  const persist = {
    user: slimUser,
    lang: state.lang,
    theme: state.theme,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persist));
  } catch (err) {
    // Quota exceeded: drop persisted state, app will rehydrate from /auth/me.
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    if (import.meta.env.DEV)
      console.warn("[store] failed to persist state", err);
  }
}

const persisted = load();
const initial = {
  // tokens live only in memory; cleared on page reload (a transparent /auth/refresh
  // call on first authenticated request will mint a fresh access token from the cookie).
  token: null,
  refreshToken: null,
  user: persisted.user || null,
  lang: persisted.lang || "id",
  theme: persisted.theme || "light",
};

const listeners = new Set();

export const store = {
  state: initial,
  getState() {
    return this.state;
  },
  setState(patch) {
    this.state = { ...this.state, ...patch };
    save(this.state);
    listeners.forEach((fn) => fn(this.state));
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  async logout() {
    // Best-effort backend revocation (also clears the refresh-token httpOnly cookie).
    try {
      const { API } = await import("../shared/utils/api.js");
      await fetch(`${API}/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: this.state.token
          ? { Authorization: `Bearer ${this.state.token}` }
          : {},
      });
    } catch (err) {
      if (import.meta.env.DEV)
        console.warn("[store] logout request failed", err);
    }
    this.setState({ token: null, refreshToken: null, user: null });
  },
};

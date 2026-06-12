import { api } from "../../../shared/utils/api.js";
import { store } from "../../../app/store.js";
import { router } from "../../../app/router.js";
import { toast, isEmail } from "../../../shared/utils/helpers.js";

export function LoginPage({ mount }) {
  mount.innerHTML = `
    <div class="auth-wrap">
      <aside class="auth-side">
        <div>
          <div class="brand" style="color:#fff;font-size:1.5rem">
            <span class="brand-logo"><i class="fa-solid fa-handshake-angle"></i></span>
            <span class="brand-name" style="color:#fff">tolong<span style="color:var(--primary-light)">in</span><span class="brand-dot" aria-hidden="true"></span></span>
          </div>
          <h2 style="margin-top:3rem">Selamat datang kembali!</h2>
          <p>Masuk untuk melanjutkan ke marketplace jasa &amp; pekerjaan terbaik di Indonesia.</p>
        </div>
        <div>
          <div class="flex gap-md mb-2">
            <i class="fa-solid fa-quote-left" style="font-size:2rem;opacity:.6"></i>
          </div>
          <p style="font-size:1.1rem;color:#fff">"Tolongin membuat saya bisa menemukan freelancer berkualitas dengan harga yang fair. Sangat membantu!"</p>
          <div class="flex gap-md" style="align-items:center;margin-top:1rem">
            <img src="https://i.pravatar.cc/60?img=12" class="avatar"/>
            <div><strong>Rina Pratiwi</strong><div style="font-size:.85rem;opacity:.8">Owner Brand Fashion</div></div>
          </div>
        </div>
      </aside>
      <div class="auth-form-wrap">
        <form class="auth-form" id="login-form" data-testid="login-form">
          <h1>Masuk</h1>
          <p class="sub">Belum punya akun? <a href="#/register" data-testid="goto-register">Daftar sekarang</a></p>
          <div class="form-group">
            <label class="label">Email</label>
            <div class="input-icon">
              <i class="fa-solid fa-envelope"></i>
              <input class="input" type="email" id="email" placeholder="email@anda.com" data-testid="login-email" required>
            </div>
          </div>
          <div class="form-group">
            <label class="label">Password</label>
            <div style="position: relative;">
              <div class="input-icon">
                <i class="fa-solid fa-lock"></i>
                <input class="input" type="password" id="password" placeholder="••••••" data-testid="login-password" required style="padding-right: 40px;">
              </div>
              <button type="button" class="toggle-password" data-target="password" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; z-index: 10; font-size: 1rem;">
                👁️
              </button>
            </div>
          </div>
          <div class="flex-between mb-2">
            <div class="text-xs text-muted">
              🔒 Sesi Anda aman dengan cookie httpOnly
            </div>
            <a href="#/forgot-password" data-testid="forgot-link" style="font-size:.85rem">Lupa password?</a>
          </div>
          <button class="btn btn-primary btn-block btn-lg" type="submit" data-testid="login-submit-btn">Masuk</button>
          <div class="auth-divider">atau</div>
          <p class="text-center text-sm text-muted">Demo: <strong>admin@tolongin.com</strong> / <strong>Admin@123</strong></p>
        </form>
      </div>
    </div>`;

  // Toggle password visibility
  document.querySelectorAll(".toggle-password").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const input = document.getElementById(targetId);
      if (input.type === "password") {
        input.type = "text";
        btn.textContent = "🙈";
      } else {
        input.type = "password";
        btn.textContent = "👁️";
      }
    });
  });

  document
    .getElementById("login-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;

      if (!isEmail(email)) return toast("Email tidak valid", "error");
      if (password.length < 6)
        return toast("Password minimal 6 karakter", "error");

      const btn = e.target.querySelector("button[type=submit]");
      btn.disabled = true;
      btn.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...';

      try {
        const { token, user } = await api.post("/auth/login", {
          email,
          password,
        });
        store.setState({ token, user });
        toast(`Halo, ${user.name}! 👋`, "success");
        router.navigate(user.role === "ADMIN" ? "/admin" : "/dashboard");
      } catch (err) {
        toast(err.message, "error");
        btn.disabled = false;
        btn.innerHTML = "Masuk";
      }
    });
}

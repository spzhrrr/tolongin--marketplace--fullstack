// frontend/src/features/auth/pages/LoginPage.js

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
          
          <!-- DEMO AKUN SECTION DENGAN KETERANGAN LENGKAP -->
          <div style="margin-bottom: 1.5rem;">
            <div style="font-size: 0.85rem; color: #0a66c2; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-flask"></i> 
              <strong>Mode Demo</strong>
              <span style="color: #666; font-weight: normal;">— Klik salah satu untuk langsung login</span>
            </div>
            
            <!-- Card Demo Seller -->
            <div style="background: linear-gradient(135deg, #e8f0fe 0%, #d4e4fc 100%); border-radius: 12px; padding: 12px 16px; margin-bottom: 12px; border-left: 4px solid #0a66c2;">
              <button type="button" class="demo-login-btn" data-email="seller@tolongin.com" data-password="Seller@123" style="background: none; border: none; width: 100%; text-align: left; cursor: pointer;">
                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                  <div style="background: #0a66c2; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                    <i class="fa-solid fa-store" style="color: white; font-size: 1.2rem;"></i>
                  </div>
                  <div style="flex: 1;">
                    <div style="font-weight: 700; font-size: 1rem;">Demo Seller</div>
                    <div style="font-size: 0.7rem; color: #0a66c2; font-family: monospace;">seller@tolongin.com</div>
                    <div style="font-size: 0.7rem; color: #666; margin-top: 2px;">Password: Seller@123</div>
                  </div>
                  <div style="background: #0a66c2; padding: 4px 12px; border-radius: 20px; color: white; font-size: 0.7rem; font-weight: 600;">
                    Klik Login →
                  </div>
                </div>
              </button>
              <div style="font-size: 0.7rem; color: #2e7d32; margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(10,102,194,0.2); display: flex; gap: 12px; flex-wrap: wrap;">
                <span><i class="fa-solid fa-check-circle"></i> Posting & menjual jasa</span>
                <span><i class="fa-solid fa-check-circle"></i> Menerima order simulasi</span>
                <span><i class="fa-solid fa-check-circle"></i> Melihat penghasilan</span>
              </div>
            </div>
            
            <!-- Card Demo Buyer -->
            <div style="background: linear-gradient(135deg, #e8f0fe 0%, #d4e4fc 100%); border-radius: 12px; padding: 12px 16px; margin-bottom: 12px; border-left: 4px solid #2e7d32;">
              <button type="button" class="demo-login-btn" data-email="buyer@tolongin.com" data-password="Buyer@123" style="background: none; border: none; width: 100%; text-align: left; cursor: pointer;">
                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                  <div style="background: #2e7d32; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                    <i class="fa-solid fa-cart-shopping" style="color: white; font-size: 1.2rem;"></i>
                  </div>
                  <div style="flex: 1;">
                    <div style="font-weight: 700; font-size: 1rem;">Demo Buyer</div>
                    <div style="font-size: 0.7rem; color: #2e7d32; font-family: monospace;">buyer@tolongin.com</div>
                    <div style="font-size: 0.7rem; color: #666; margin-top: 2px;">Password: Buyer@123</div>
                  </div>
                  <div style="background: #2e7d32; padding: 4px 12px; border-radius: 20px; color: white; font-size: 0.7rem; font-weight: 600;">
                    Klik Login →
                  </div>
                </div>
              </button>
              <div style="font-size: 0.7rem; color: #2e7d32; margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(46,125,50,0.2); display: flex; gap: 12px; flex-wrap: wrap;">
                <span><i class="fa-solid fa-check-circle"></i> Mencari & memesan jasa</span>
                <span><i class="fa-solid fa-check-circle"></i> Posting pekerjaan</span>
                <span><i class="fa-solid fa-check-circle"></i> Menerima lamaran simulasi</span>
              </div>
            </div>
            
            <!-- Card Demo Admin -->
            <div style="background: linear-gradient(135deg, #e8f0fe 0%, #d4e4fc 100%); border-radius: 12px; padding: 12px 16px; margin-bottom: 8px; border-left: 4px solid #dc3545;">
              <button type="button" class="demo-login-btn" data-email="admin@tolongin.com" data-password="Admin@123" style="background: none; border: none; width: 100%; text-align: left; cursor: pointer;">
                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                  <div style="background: #dc3545; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                    <i class="fa-solid fa-shield-halved" style="color: white; font-size: 1.2rem;"></i>
                  </div>
                  <div style="flex: 1;">
                    <div style="font-weight: 700; font-size: 1rem;">Demo Admin</div>
                    <div style="font-size: 0.7rem; color: #dc3545; font-family: monospace;">admin@tolongin.com</div>
                    <div style="font-size: 0.7rem; color: #666; margin-top: 2px;">Password: Admin@123</div>
                  </div>
                  <div style="background: #dc3545; padding: 4px 12px; border-radius: 20px; color: white; font-size: 0.7rem; font-weight: 600;">
                    Klik Login →
                  </div>
                </div>
              </button>
              <div style="font-size: 0.7rem; color: #dc3545; margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(220,53,69,0.2); display: flex; gap: 12px; flex-wrap: wrap;">
                <span><i class="fa-solid fa-check-circle"></i> Akses semua data</span>
                <span><i class="fa-solid fa-check-circle"></i> Monitoring platform</span>
                <span><i class="fa-solid fa-check-circle"></i> Kelola semua pengguna</span>
              </div>
            </div>
            
            <div style="font-size: 0.7rem; color: #999; margin-top: 12px; text-align: center; padding: 8px; background: #f5f5f5; border-radius: 8px;">
              <i class="fa-solid fa-info-circle"></i> 
              <strong>Fitur Demo:</strong> Posting jasa → order simulasi (12 detik) | Posting job → lamaran simulasi (10 detik) | Order auto-progress sampai selesai
            </div>
          </div>
          
          <div class="auth-divider" style="margin: 1rem 0; text-align: center; position: relative;">
            <span style="background: #fff; padding: 0 10px; color: #999; font-size: 0.8rem;">atau login dengan akun Anda sendiri</span>
          </div>
          
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
        </form>
      </div>
    </div>
    
    <style>
      .demo-login-btn {
        transition: all 0.2s ease;
      }
      .demo-login-btn:hover {
        transform: translateX(4px);
      }
      .auth-divider {
        border-top: 1px solid #e0e0e0;
      }
    </style>
  `;

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

  // Demo login buttons
  document.querySelectorAll(".demo-login-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const email = btn.getAttribute("data-email");
      const password = btn.getAttribute("data-password");
      
      // Isi form
      document.getElementById("email").value = email;
      document.getElementById("password").value = password;
      
      // Trigger login
      const submitBtn = document.querySelector("#login-form button[type=submit]");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...';
      }
      
      try {
        const { token, user } = await api.post("/auth/login", { email, password });
        store.setState({ token, user });
        
        // Welcome message based on role
        let roleText = "";
        let suggestion = "";
        if (user.role === "ADMIN") {
          roleText = "Administrator";
          suggestion = "Anda dapat melihat semua data platform.";
        } else if (email === "seller@tolongin.com") {
          roleText = "Penjual";
          suggestion = "Coba posting jasa baru! Order simulasi akan masuk dalam 12 detik.";
        } else if (email === "buyer@tolongin.com") {
          roleText = "Pembeli";
          suggestion = "Coba posting pekerjaan baru! Lamaran simulasi akan masuk dalam 10 detik.";
        }
        
        toast(`✨ Selamat datang, ${user.name}! ✨\nRole: ${roleText}\n${suggestion}`, "success", 5000);
        
        // Navigate based on role
        if (user.role === "ADMIN") {
          router.navigate("/admin");
        } else {
          router.navigate("/dashboard");
        }
      } catch (err) {
        toast(err.message || "Login gagal", "error");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = "Masuk";
        }
      }
    });
  });

  // Regular form submission
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
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...';

      try {
        const { token, user } = await api.post("/auth/login", {
          email,
          password,
        });
        store.setState({ token, user });
        
        toast(`Halo, ${user.name}! 👋 Selamat datang kembali.`, "success", 3000);
        router.navigate(user.role === "ADMIN" ? "/admin" : "/dashboard");
      } catch (err) {
        toast(err.message, "error");
        btn.disabled = false;
        btn.innerHTML = "Masuk";
      }
    });
}

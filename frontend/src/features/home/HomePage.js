import { api } from "../../shared/utils/api.js";
import { t } from "../../shared/utils/i18n.js";
import { serviceCard } from "../../shared/ui/components.js";
import { escape } from "../../shared/utils/helpers.js";

export async function HomePage({ mount }) {
  mount.innerHTML = `
    <section class="hero">
      <div class="container hero-inner">
        <div>
          <span class="hero-eyebrow"><i class="fa-solid fa-star"></i> Marketplace Jasa &amp; Lowongan #1 di Indonesia</span>
          <h1>Cari bantuan, tawarkan kemampuan — semua di <span class="accent">tolong<span class="brand-accent">in</span><span class="brand-dot" aria-hidden="true"></span></span></h1>
          <p class="lead">Satu akun, banyak kemungkinan. Temukan jasa terbaik, pasang lowongan, atau jual keahlian Anda dengan aman lewat sistem escrow.</p>
          <div class="hero-actions">
            <a class="btn btn-primary btn-lg" href="#/marketplace" data-testid="hero-cta-marketplace"><i class="fa-solid fa-magnifying-glass"></i> Cari Jasa</a>
            <a class="btn btn-outline btn-lg" href="#/jobs" data-testid="hero-cta-jobs"><i class="fa-solid fa-briefcase"></i> Cari Kerja</a>
            <a class="btn btn-secondary btn-lg" href="#/dashboard/manage-services/new" data-testid="hero-cta-seller"><i class="fa-solid fa-rocket"></i> Tawarkan Jasa</a>
          </div>
          <div class="flex gap-md mt-3" style="align-items:center">
            <div style="display:flex">
              ${[1, 2, 3, 4].map((i) => `<img src="https://i.pravatar.cc/40?img=${i + 10}" class="avatar avatar-sm" style="margin-left:-10px;border:2px solid white"/>`).join("")}
            </div>
            <div class="text-sm"><strong>10,000+</strong> freelancer terpercaya</div>
          </div>
        </div>
        <div class="hero-visual">
          <div class="hero-img-wrap"><img src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&q=80" alt="hero" /></div>
          <div class="hero-card-float c1"><div class="ic"><i class="fa-solid fa-circle-check"></i></div><div><div style="font-weight:700;font-size:.85rem">Verified Sellers</div><div class="text-xs text-muted">100% terpercaya</div></div></div>
          <div class="hero-card-float c2"><div class="ic"><i class="fa-solid fa-shield-halved"></i></div><div><div style="font-weight:700;font-size:.85rem">Pembayaran Aman</div><div class="text-xs text-muted">Escrow protection</div></div></div>
          <div class="hero-card-float c3"><div class="ic"><i class="fa-solid fa-bolt"></i></div><div><div style="font-weight:700;font-size:.85rem">Cepat &amp; Mudah</div><div class="text-xs text-muted">24/7 support</div></div></div>
        </div>
      </div>
    </section>

    <div class="container">
      <div class="stats-bar" data-testid="stats-bar">
        <div class="stat"><div class="stat-num">10K+</div><div class="stat-label">Freelancer Aktif</div></div>
        <div class="stat"><div class="stat-num">50K+</div><div class="stat-label">Pesanan Selesai</div></div>
        <div class="stat"><div class="stat-num">4.9★</div><div class="stat-label">Rating Rata-rata</div></div>
        <div class="stat"><div class="stat-num">34</div><div class="stat-label">Provinsi</div></div>
      </div>
    </div>

    <section class="section">
      <div class="container">
        <div class="section-head">
          <span class="section-eyebrow">Kategori</span>
          <h2>${t("sec.cats")}</h2>
          <p>${t("sec.cats.sub")}</p>
        </div>
        <div class="cat-grid" id="cat-grid"></div>
      </div>
    </section>

    <section class="section" style="background:#fff">
      <div class="container">
        <div class="section-head">
          <span class="section-eyebrow">Mudah</span>
          <h2>${t("sec.how")}</h2>
          <p>${t("sec.how.sub")}</p>
        </div>
        <div class="steps">
          <div class="step"><h3>Satu Akun untuk Semua</h3><p>Daftar gratis, satu akun bisa cari jasa, cari kerja, dan menjual layanan.</p></div>
          <div class="step"><h3>Cari atau Posting</h3><p>Temukan jasa yang sesuai atau posting pekerjaan yang Anda butuhkan.</p></div>
          <div class="step"><h3>Berkolaborasi</h3><p>Chat langsung, sepakati detail, dan mulai kerjakan proyek.</p></div>
          <div class="step"><h3>Selesai &amp; Review</h3><p>Bayar setelah puas, beri rating dan review untuk freelancer.</p></div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head">
          <span class="section-eyebrow">Featured</span>
          <h2>${t("sec.featured")}</h2>
          <p>${t("sec.featured.sub")}</p>
        </div>
        <div class="grid grid-3" id="feat-services"></div>
        <div class="text-center mt-3"><a class="btn btn-outline" href="#/marketplace" data-testid="see-all-services">Lihat Semua Jasa <i class="fa-solid fa-arrow-right"></i></a></div>
      </div>
    </section>

    <section class="section" style="background:#fff">
      <div class="container">
        <div class="section-head">
          <span class="section-eyebrow">Testimoni</span>
          <h2>${t("sec.testi")}</h2>
          <p>${t("sec.testi.sub")}</p>
        </div>
        <div class="grid grid-3">
          ${[
            {
              name: "Rina Pratiwi",
              role: "Owner Brand Fashion",
              q: "Saya dapat designer logo yang amazing hanya dalam 3 hari. Tolongin benar-benar membantu bisnis saya naik level!",
            },
            {
              name: "Aditya Wirawan",
              role: "Mahasiswa",
              q: "Sebagai freelancer pemula, Tolongin memberikan saya kesempatan menambah penghasilan dengan klien-klien serius.",
            },
            {
              name: "Maya Sari",
              role: "Founder Startup",
              q: "Platformnya sangat user-friendly, pembayaran aman, dan kualitas freelancer di atas rata-rata. Sangat direkomendasikan!",
            },
          ]
            .map(
              (tt, i) => `
            <div class="testimonial">
              <div class="stars">${'<i class="fa-solid fa-star"></i>'.repeat(5)}</div>
              <p class="quote">"${escape(tt.q)}"</p>
              <div class="who">
                <img src="https://i.pravatar.cc/100?img=${i + 20}" class="avatar"/>
                <div><div class="name">${tt.name}</div><div class="role">${tt.role}</div></div>
              </div>
            </div>`,
            )
            .join("")}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="sdg">
          <div>
            <span class="section-eyebrow" style="color:#fff;opacity:.85">SDGs</span>
            <h2>${t("sdg.title")}</h2>
            <p>${t("sdg.sub")}</p>
            <div class="sdg-badges">
              <span class="sdg-badge">SDG 1 — No Poverty</span>
              <span class="sdg-badge">SDG 8 — Decent Work</span>
              <span class="sdg-badge">SDG 9 — Innovation</span>
              <span class="sdg-badge">SDG 10 — Reduced Inequalities</span>
            </div>
          </div>
          <img src="https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600" style="border-radius:18px" alt="sdg"/>
        </div>
      </div>
    </section>
  `;

  try {
    const [cats, servicesResp] = await Promise.all([
      api.get("/categories"),
      api.get("/services/featured"),
    ]);
    const services = Array.isArray(servicesResp)
      ? servicesResp
      : servicesResp.data || [];
    const grid = document.getElementById("cat-grid");
    if (grid) {
      grid.innerHTML = cats
        .map(
          (c) => `
        <a class="cat-card" href="#/marketplace?category=${encodeURIComponent(c.slug)}" data-testid="cat-${c.slug}">
          <div class="cat-icon"><i class="fa-solid ${(c.icon || "fa-folder").startsWith("fa-") ? c.icon : "fa-" + c.icon}"></i></div>
          <div class="cat-name">${c.name}</div>
        </a>`,
        )
        .join("");
    }
    const feat = document.getElementById("feat-services");
    if (feat) {
      feat.innerHTML = services
        .slice(0, 6)
        .map((s) => serviceCard(s))
        .join("");
    }
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[home] failed to load", e);
  }
}

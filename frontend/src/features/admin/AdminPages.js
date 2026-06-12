import { api } from "../../shared/utils/api.js";
import {
  escape,
  fmtIDR,
  fmtDate,
  toast,
  confirmModal,
  timeAgo,
} from "../../shared/utils/helpers.js";
import { statusPill, avatar, empty } from "../../shared/ui/components.js";
import { router } from "../../app/router.js";

function adminSide(active) {
  return `<aside class="dash-side">
    <div class="who"><i class="fa-solid fa-shield-halved" style="font-size:1.5rem;color:var(--primary)"></i><div><div class="name">Admin Panel</div><div class="role">Tolongin</div></div></div>
    <a href="#/admin" class="side-link ${active === "home" ? "active" : ""}" data-testid="admin-side-home"><i class="fa-solid fa-gauge"></i> Dashboard</a>
    <a href="#/admin/sellers" class="side-link ${active === "sellers" ? "active" : ""}" data-testid="admin-side-sellers"><i class="fa-solid fa-user-check"></i> Verifikasi Penjual</a>
    <a href="#/admin/kyc" class="side-link ${active === "kyc" ? "active" : ""}" data-testid="admin-side-kyc"><i class="fa-solid fa-id-card"></i> Review KYC</a>
    <a href="#/admin/users" class="side-link ${active === "users" ? "active" : ""}" data-testid="admin-side-users"><i class="fa-solid fa-users"></i> Kelola User</a>
    <a href="#/admin/services" class="side-link ${active === "svc" ? "active" : ""}" data-testid="admin-side-svc"><i class="fa-solid fa-box"></i> Kelola Jasa</a>
    <a href="#/admin/jobs" class="side-link ${active === "jobs" ? "active" : ""}" data-testid="admin-side-jobs"><i class="fa-solid fa-briefcase"></i> Kelola Job</a>
    <a href="#/admin/disputes" class="side-link ${active === "disp" ? "active" : ""}" data-testid="admin-side-disp"><i class="fa-solid fa-flag"></i> Sengketa</a>
    <a href="#/admin/settings" class="side-link ${active === "set" ? "active" : ""}" data-testid="admin-side-set"><i class="fa-solid fa-gear"></i> Pengaturan</a>
    <a href="#/admin/activity" class="side-link ${active === "act" ? "active" : ""}" data-testid="admin-side-act"><i class="fa-solid fa-clock-rotate-left"></i> Activity Log</a>
  </aside>`;
}

export async function AdminDashboard({ mount }) {
  mount.innerHTML = `<div class="container page"><div class="dash-wrap">${adminSide("home")}<section><div class="spinner"></div></section></div></div>`;
  const main = mount.querySelector("section");
  try {
    const s = await api.get("/admin/stats");
    main.innerHTML = `
      <h1 class="page-title">Admin Dashboard</h1>
      <p class="page-subtitle">Ringkasan platform Tolongin</p>
      <div class="kpis">
        <div class="kpi"><div class="ic"><i class="fa-solid fa-users"></i></div><div class="v">${s.users}</div><div class="l">Total User</div></div>
        <div class="kpi"><div class="ic"><i class="fa-solid fa-box"></i></div><div class="v">${s.services}</div><div class="l">Total Jasa</div></div>
        <div class="kpi"><div class="ic"><i class="fa-solid fa-briefcase"></i></div><div class="v">${s.jobs}</div><div class="l">Total Job</div></div>
        <div class="kpi"><div class="ic"><i class="fa-solid fa-receipt"></i></div><div class="v">${s.orders}</div><div class="l">Total Order</div></div>
        <div class="kpi"><div class="ic"><i class="fa-solid fa-user-clock"></i></div><div class="v">${s.pendingSellers}</div><div class="l">Penjual Menunggu</div></div>
        <div class="kpi"><div class="ic"><i class="fa-solid fa-flag"></i></div><div class="v">${s.disputes}</div><div class="l">Sengketa Aktif</div></div>
        <div class="kpi" style="grid-column:span 2"><div class="ic"><i class="fa-solid fa-coins"></i></div><div class="v">${fmtIDR(s.revenue || 0)}</div><div class="l">Total Revenue</div></div>
      </div>`;
  } catch (e) {
    main.innerHTML = empty("Gagal memuat", e.message);
  }
}

export async function VerifySellers({ mount }) {
  mount.innerHTML = `<div class="container page"><div class="dash-wrap">${adminSide("sellers")}<section><h1>Verifikasi Penjual</h1><div id="list"></div></section></div></div>`;
  const load = async () => {
    const users = await api.get("/admin/users");
    const pending = users.filter(
      (u) => ["SELLER"].includes(u.role) && !u.verified,
    );
    document.getElementById("list").innerHTML = pending.length
      ? `
      <div class="card scroll-x"><table class="tbl">
        <thead><tr><th>Nama</th><th>Email</th><th>Kota</th><th>Daftar</th><th></th></tr></thead>
        <tbody>${pending
          .map(
            (u) => `<tr>
          <td><div class="flex gap-sm" style="align-items:center">${avatar(u, "sm")}<strong>${escape(u.name)}</strong></div></td>
          <td>${escape(u.email)}</td><td>${escape(u.city || "-")}</td><td>${fmtDate(u.createdAt)}</td>
          <td><button class="btn btn-success btn-sm" data-verify="${u.id}" data-testid="verify-${u.id}"><i class="fa-solid fa-check"></i> Verifikasi</button></td>
        </tr>`,
          )
          .join("")}</tbody>
      </table></div>`
      : empty("Tidak ada penjual menunggu", "", "fa-circle-check");
    document.querySelectorAll("[data-verify]").forEach((b) =>
      b.addEventListener("click", async () => {
        try {
          await api.post(`/admin/users/${b.dataset.verify}/verify`);
          toast("Penjual diverifikasi", "success");
          load();
        } catch (err) {
          toast(err.message, "error");
        }
      }),
    );
  };
  load();
}

export async function ManageUsers({ mount }) {
  mount.innerHTML = `<div class="container page"><div class="dash-wrap">${adminSide("users")}<section><h1>Kelola User</h1><div id="list"></div></section></div></div>`;
  const load = async () => {
    const u = await api.get("/admin/users");
    document.getElementById("list").innerHTML = `
      <div class="card scroll-x"><table class="tbl">
        <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
        <tbody>${u
          .map(
            (x) => `<tr>
          <td><div class="flex gap-sm" style="align-items:center">${avatar(x, "sm")}<strong>${escape(x.name)}</strong>${x.verified ? '<i class="fa-solid fa-circle-check" style="color:var(--primary)"></i>' : ""}</div></td>
          <td>${escape(x.email)}</td><td><span class="badge">${x.role}</span></td>
          <td>${x.suspended ? '<span class="badge badge-danger">Suspended</span>' : '<span class="badge badge-success">Active</span>'}</td>
          <td>${x.role !== "ADMIN" ? `<button class="btn ${x.suspended ? "btn-success" : "btn-danger"} btn-sm" data-suspend="${x.id}" data-testid="suspend-${x.id}">${x.suspended ? "Aktifkan" : "Suspend"}</button>` : "-"}</td>
        </tr>`,
          )
          .join("")}</tbody>
      </table></div>`;
    document.querySelectorAll("[data-suspend]").forEach((b) =>
      b.addEventListener("click", () =>
        confirmModal("Ubah status user?", async () => {
          try {
            await api.post(`/admin/users/${b.dataset.suspend}/suspend`);
            toast("Berhasil", "success");
            load();
          } catch (err) {
            toast(err.message, "error");
          }
        }),
      ),
    );
  };
  load();
}

export async function ManageServices({ mount }) {
  mount.innerHTML = `<div class="container page"><div class="dash-wrap">${adminSide("svc")}<section><h1>Kelola Jasa</h1><div id="list"></div></section></div></div>`;
  const load = async () => {
    const s = await api.get("/admin/services");
    document.getElementById("list").innerHTML =
      `<div class="card scroll-x"><table class="tbl"><thead><tr><th>Jasa</th><th>Kategori</th><th>Harga</th><th></th></tr></thead><tbody>
      ${s.map((x) => `<tr><td>${escape(x.title)}</td><td><span class="badge">${escape(x.category)}</span></td><td>${fmtIDR(x.price)}</td><td><a class="btn btn-secondary btn-sm" href="#/service/${x.id}">Lihat</a> <button class="btn btn-danger btn-sm" data-del-svc="${x.id}" data-testid="adm-del-svc-${x.id}">Hapus</button></td>`).join("")}
    </tbody></table></div>`;
    document.querySelectorAll("[data-del-svc]").forEach((b) =>
      b.addEventListener("click", () =>
        confirmModal("Hapus jasa?", async () => {
          try {
            await api.del("/services/" + b.dataset.delSvc);
            toast("Dihapus", "success");
            load();
          } catch (err) {
            toast(err.message, "error");
          }
        }),
      ),
    );
  };
  load();
}

export async function ManageJobs({ mount }) {
  mount.innerHTML = `<div class="container page"><div class="dash-wrap">${adminSide("jobs")}<section><h1>Kelola Job</h1><div id="list"></div></section></div></div>`;
  const load = async () => {
    const j = await api.get("/admin/jobs");
    document.getElementById("list").innerHTML =
      `<div class="card scroll-x"><table class="tbl"><thead><tr><th>Judul</th><th>Kategori</th><th>Budget</th><th>Status</th><th></th></tr></thead><tbody>
      ${j.map((x) => `<tr><td>${escape(x.title)}</td><td>${escape(x.category)}</td><td>${fmtIDR(x.budget)}</td><td>${statusPill(x.status)}</td><td><a class="btn btn-secondary btn-sm" href="#/jobs/${x.id}">Lihat</a> <button class="btn btn-danger btn-sm" data-del-job="${x.id}" data-testid="adm-del-job-${x.id}">Hapus</button></td>`).join("")}
    </tbody></table></div>`;
    document.querySelectorAll("[data-del-job]").forEach((b) =>
      b.addEventListener("click", () =>
        confirmModal("Hapus job?", async () => {
          try {
            await api.del("/jobs/" + b.dataset.delJob);
            toast("Dihapus", "success");
            load();
          } catch (err) {
            toast(err.message, "error");
          }
        }),
      ),
    );
  };
  load();
}

export async function ManageDisputes({ mount }) {
  mount.innerHTML = `<div class="container page"><div class="dash-wrap">${adminSide("disp")}<section><h1>Sengketa</h1><div id="list"></div></section></div></div>`;
  const load = async () => {
    const d = await api.get("/admin/disputes");
    document.getElementById("list").innerHTML = d.length
      ? `<div class="card scroll-x"><table class="tbl"><thead><tr><th>Order</th><th>Alasan</th><th>Status</th><th>Waktu</th><th></th></tr></thead><tbody>
      ${d.map((x) => `<tr><td>#${x.orderId.slice(0, 8)}</td><td>${escape(x.reason)}</td><td>${statusPill(x.status)}</td><td>${timeAgo(x.createdAt)}</td><td>${x.status === "open" ? `<button class="btn btn-success btn-sm" data-resolve="${x.id}" data-testid="resolve-${x.id}">Selesaikan</button>` : ""}</td>`).join("")}
    </tbody></table></div>`
      : empty("Tidak ada sengketa", "", "fa-circle-check");
    document.querySelectorAll("[data-resolve]").forEach((b) =>
      b.addEventListener("click", async () => {
        try {
          await api.post(`/admin/disputes/${b.dataset.resolve}/resolve`);
          toast("Diselesaikan", "success");
          load();
        } catch (err) {
          toast(err.message, "error");
        }
      }),
    );
  };
  load();
}

export async function PlatformSettings({ mount }) {
  mount.innerHTML = `<div class="container page"><div class="dash-wrap">${adminSide("set")}<section>
    <h1>Pengaturan Platform</h1>
    <div class="card card-pad-lg">
      <div class="form-group"><label class="label">Nama Platform</label><input class="input" value="Tolongin" data-testid="setting-name"></div>
      <div class="form-group"><label class="label">Platform Fee (%)</label><input class="input" type="number" value="5" data-testid="setting-fee"></div>
      <div class="form-group"><label class="label">Min Withdraw (Rp)</label><input class="input" type="number" value="100000" data-testid="setting-min-wd"></div>
      <div class="form-group"><label class="label">Email Support</label><input class="input" value="support@tolongin.id" data-testid="setting-email"></div>
      <button class="btn btn-primary" data-testid="settings-save" id="ss-save">Simpan</button>
    </div>
  </section></div></div>`;
  document
    .getElementById("ss-save")
    .addEventListener("click", () =>
      toast("Pengaturan disimpan (demo)", "success"),
    );
}

export async function ActivityLog({ mount }) {
  mount.innerHTML = `<div class="container page"><div class="dash-wrap">${adminSide("act")}<section><h1>Activity Log</h1><div id="list"></div></section></div></div>`;
  try {
    const a = await api.get("/admin/activity");
    document.getElementById("list").innerHTML = a.length
      ? `<div class="card card-pad-lg"><div class="timeline">
      ${a.map((x) => `<div class="tl-step done"><strong>${escape(x.type)}</strong> — ${escape(x.message)}<div class="tl-time">${timeAgo(x.createdAt)}</div></div>`).join("")}
    </div></div>`
      : empty("Belum ada aktivitas");
  } catch (e) {
    document.getElementById("list").innerHTML = empty(
      "Gagal memuat",
      e.message,
    );
  }
}

export async function ManageKyc({ mount }) {
  mount.innerHTML = `<div class="container page"><div class="dash-wrap">${adminSide("kyc")}<section>
    <div class="flex-between mb-2"><h1>Review KYC</h1>
      <div class="flex gap-sm">
        <button class="btn btn-secondary btn-sm" data-tab="pending" data-testid="kyc-tab-pending">Pending</button>
        <button class="btn btn-ghost btn-sm" data-tab="approved" data-testid="kyc-tab-approved">Approved</button>
        <button class="btn btn-ghost btn-sm" data-tab="rejected" data-testid="kyc-tab-rejected">Rejected</button>
      </div>
    </div>
    <div id="list"></div>
  </section></div></div>`;
  let activeTab = "pending";
  const load = async () => {
    mount
      .querySelectorAll("[data-tab]")
      .forEach((b) =>
        b.classList.toggle("btn-secondary", b.dataset.tab === activeTab),
      );
    mount
      .querySelectorAll("[data-tab]")
      .forEach((b) =>
        b.classList.toggle("btn-ghost", b.dataset.tab !== activeTab),
      );
    try {
      const users = await api.get("/admin/kyc?status=" + activeTab);
      document.getElementById("list").innerHTML = users.length
        ? users
            .map((u) => {
              const k = u.kyc || {};
              return `<div class="card card-pad-lg mb-2" data-testid="kyc-row-${u.id}">
          <div class="flex gap-md" style="align-items:flex-start;flex-wrap:wrap">
            <div style="flex:1;min-width:240px">
              <div class="flex gap-sm" style="align-items:center"><img src="${u.avatar}" class="avatar"/><div><strong>${escape(u.name)}</strong><div class="text-sm text-muted">${escape(u.email)}</div></div></div>
              <table class="tbl" style="margin-top:.75rem">
                <tr><td>Nama Lengkap</td><td><strong>${escape(k.fullName || "-")}</strong></td></tr>
                <tr><td>No. KTP</td><td>${escape(k.ktpNumber || "-")}</td></tr>
                <tr><td>Bank</td><td>${escape(k.bankName || "-")} — ${escape(k.bankAccountNumber || "-")}</td></tr>
                <tr><td>Atas Nama</td><td>${escape(k.bankAccountName || "-")}</td></tr>
                <tr><td>Dikirim</td><td>${timeAgo(k.submittedAt)}</td></tr>
                ${k.rejectReason ? `<tr><td>Alasan Tolak</td><td style="color:#dc2626">${escape(k.rejectReason)}</td></tr>` : ""}
              </table>
            </div>
            <div style="display:flex;gap:.5rem;flex-wrap:wrap">
              ${k.ktpPhoto ? `<div><div class="text-xs text-muted">KTP</div><img src="${escape(k.ktpPhoto)}" style="width:160px;height:100px;object-fit:cover;border-radius:8px;border:1px solid var(--border)"/></div>` : ""}
              ${k.ktpSelfie ? `<div><div class="text-xs text-muted">Selfie</div><img src="${escape(k.ktpSelfie)}" style="width:160px;height:100px;object-fit:cover;border-radius:8px;border:1px solid var(--border)"/></div>` : ""}
            </div>
          </div>
          ${
            activeTab === "pending"
              ? `<div class="flex gap-sm" style="justify-content:flex-end;margin-top:1rem">
            <button class="btn btn-danger btn-sm" data-reject="${u.id}" data-testid="kyc-reject-${u.id}"><i class="fa-solid fa-xmark"></i> Tolak</button>
            <button class="btn btn-success btn-sm" data-approve="${u.id}" data-testid="kyc-approve-${u.id}"><i class="fa-solid fa-check"></i> Setujui</button>
          </div>`
              : ""
          }
        </div>`;
            })
            .join("")
        : empty("Tidak ada submission " + activeTab, "", "fa-circle-check");

      document.querySelectorAll("[data-reject]").forEach((b) =>
        b.addEventListener("click", () => {
          const modalDiv = document.createElement("div");
          modalDiv.className = "modal-overlay";
          modalDiv.innerHTML = `
      <div class="modal modal-sm">
        <div class="modal-header">
          <h3 class="modal-title">Tolak Verifikasi KTP</h3>
          <button class="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Alasan Penolakan</label>
            <textarea id="reject-reason" class="form-textarea" rows="4" placeholder="Berikan alasan penolakan KTP ini..."></textarea>
            <div class="form-error" id="reason-error"></div>
            <div class="form-hint">Alasan akan ditampilkan ke user</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline cancel-btn">Batal</button>
          <button class="btn btn-danger confirm-reject-btn">Tolak</button>
        </div>
      </div>
    `;
          document.body.appendChild(modalDiv);
          const closeModal = () => modalDiv.remove();
          modalDiv
            .querySelector(".modal-close")
            .addEventListener("click", closeModal);
          modalDiv
            .querySelector(".cancel-btn")
            .addEventListener("click", closeModal);
          modalDiv.addEventListener("click", (e) => {
            if (e.target === modalDiv) closeModal();
          });
          const confirmBtn = modalDiv.querySelector(".confirm-reject-btn");
          confirmBtn.addEventListener("click", async () => {
            const reason = modalDiv
              .querySelector("#reject-reason")
              .value.trim();
            if (!reason) {
              modalDiv.querySelector("#reason-error").textContent =
                "Alasan penolakan wajib diisi";
              return;
            }
            if (reason.length < 3) {
              modalDiv.querySelector("#reason-error").textContent =
                "Alasan minimal 3 karakter";
              return;
            }
            confirmBtn.disabled = true;
            confirmBtn.textContent = "Memproses...";
            try {
              await api.post(`/admin/kyc/${b.dataset.reject}/reject`, {
                reason,
              });
              closeModal();
              toast("KYC ditolak", "success");
              load();
            } catch (err) {
              modalDiv.querySelector("#reason-error").textContent = err.message;
              confirmBtn.disabled = false;
              confirmBtn.textContent = "Tolak";
            }
          });
        }),
      );
    } catch (e) {
      document.getElementById("list").innerHTML = empty(
        "Gagal memuat",
        e.message,
      );
    }
  };
  mount.querySelectorAll("[data-tab]").forEach((b) =>
    b.addEventListener("click", () => {
      activeTab = b.dataset.tab;
      load();
    }),
  );
  load();
}

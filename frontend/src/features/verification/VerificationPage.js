import { api } from "../../shared/utils/api.js";
import { toast, modal, escape } from "../../shared/utils/helpers.js";
import { store } from "../../app/store.js";
import { router } from "../../app/router.js";

function getStatusLabel(status) {
  const labels = {
    VERIFIED:
      '<span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> Terverifikasi</span>',
    PENDING:
      '<span class="badge badge-warning"><i class="fa-solid fa-clock"></i> Menunggu Review</span>',
    REJECTED:
      '<span class="badge badge-danger"><i class="fa-solid fa-xmark"></i> Ditolak</span>',
    NOT_SUBMITTED:
      '<span class="badge"><i class="fa-solid fa-upload"></i> Belum Disubmit</span>',
  };
  return labels[status] || `<span class="badge">${status}</span>`;
}

function stepIcon(done) {
  return done
    ? '<i class="fa-solid fa-circle-check" style="color:var(--success);font-size:1.5rem"></i>'
    : '<i class="fa-regular fa-circle" style="color:var(--text-2);font-size:1.5rem"></i>';
}

export async function VerificationPage({ mount }) {
  const { user } = store.getState();
  if (!user) {
    router.navigate("/login");
    return;
  }

  // Load status
  let vs = {};
  try {
    vs = await api.get("/verification/status");
  } catch (_) {
    // ignore — defaults will be used
  }

  const emailDone = vs.emailVerified ?? user.emailVerified ?? false;
  const phoneDone = vs.phoneVerified ?? user.phoneVerified ?? false;
  const ktpStatus = vs.ktp?.status || user.ktpStatus || "NOT_SUBMITTED";
  const bankStatus = vs.bank?.status || user.bankStatus || "NOT_SUBMITTED";

  // Render halaman
  mount.innerHTML = `
    <div class="container page">
      <h1 class="page-title">Verifikasi Identitas</h1>
      <p class="page-subtitle">Selesaikan verifikasi bertahap untuk membuka semua fitur Tolongin</p>

      <!-- Progress Bar -->
      <div class="card card-pad-lg mb-4">
        <div class="flex gap-md" style="align-items:flex-start;flex-wrap:wrap">
          <div style="flex:1;text-align:center;min-width:100px">
            ${stepIcon(emailDone)}
            <div class="text-sm mt-1" style="font-weight:600">Email</div>
            <div class="text-xs text-muted">Level 1</div>
          </div>
          <div style="flex:none;padding-top:.7rem;color:var(--border)">→</div>
          <div style="flex:1;text-align:center;min-width:100px">
            ${stepIcon(phoneDone)}
            <div class="text-sm mt-1" style="font-weight:600">Telepon</div>
            <div class="text-xs text-muted">Level 1</div>
          </div>
          <div style="flex:none;padding-top:.7rem;color:var(--border)">→</div>
          <div style="flex:1;text-align:center;min-width:100px">
            ${stepIcon(ktpStatus === "VERIFIED")}
            <div class="text-sm mt-1" style="font-weight:600">KTP</div>
            <div class="text-xs text-muted">Level 2</div>
          </div>
          <div style="flex:none;padding-top:.7rem;color:var(--border)">→</div>
          <div style="flex:1;text-align:center;min-width:100px">
            ${stepIcon(bankStatus === "VERIFIED")}
            <div class="text-sm mt-1" style="font-weight:600">Rekening Bank</div>
            <div class="text-xs text-muted">Level 3</div>
          </div>
        </div>
      </div>

      <!-- STEP 1: EMAIL VERIFICATION -->
      <div class="card card-pad-lg mb-4" id="email-step">
        <div class="flex-between" style="align-items:center;flex-wrap:wrap;gap:1rem">
          <div>
            <h2 style="margin:0"><i class="fa-solid fa-envelope"></i> Verifikasi Email</h2>
            <p class="text-muted" style="margin:.25rem 0 0">Masukkan kode OTP yang dikirim ke ${escape(user.email)}</p>
          </div>
          ${getStatusLabel(emailDone ? "VERIFIED" : "NOT_SUBMITTED")}
        </div>
        ${
          emailDone
            ? `<div class="alert alert-success mt-3"><i class="fa-solid fa-circle-check"></i> Email <strong>${escape(user.email)}</strong> sudah terverifikasi.</div>`
            : `<div class="mt-3" id="email-form-wrap">
              <div class="flex gap-sm" style="flex-wrap:wrap">
                <button class="btn btn-primary" id="send-email-otp" data-testid="send-email-otp-btn">
                  <i class="fa-solid fa-paper-plane"></i> Kirim Kode OTP ke Email
                </button>
              </div>
              <div id="email-otp-row" style="display:none;margin-top:1rem">
                <div class="form-group">
                  <label class="label">Kode OTP (6 digit)</label>
                  <div style="display:flex;gap:.5rem;max-width:320px">
                    <input class="input" id="email-otp-input" maxlength="6" placeholder="123456" data-testid="email-otp-input" style="letter-spacing:4px;font-size:1.2rem;text-align:center">
                    <button class="btn btn-primary" id="verify-email-otp" data-testid="verify-email-otp-btn">Verifikasi</button>
                  </div>
                </div>
                <button class="btn btn-ghost btn-sm" id="resend-email-otp" data-testid="resend-email-otp-btn">
                  <i class="fa-solid fa-rotate-right"></i> Kirim Ulang
                </button>
              </div>
            </div>`
        }
      </div>

      <!-- STEP 2: PHONE VERIFICATION -->
      <div class="card card-pad-lg mb-4" id="phone-step">
        <div class="flex-between" style="align-items:center;flex-wrap:wrap;gap:1rem">
          <div>
            <h2 style="margin:0"><i class="fa-solid fa-mobile-screen"></i> Verifikasi Nomor Telepon</h2>
            <p class="text-muted" style="margin:.25rem 0 0">Verifikasi nomor HP untuk melamar pekerjaan</p>
          </div>
          ${getStatusLabel(phoneDone ? "VERIFIED" : "NOT_SUBMITTED")}
        </div>
        ${
          phoneDone
            ? `<div class="alert alert-success mt-3"><i class="fa-solid fa-circle-check"></i> Nomor telepon sudah terverifikasi.</div>`
            : `<div class="mt-3">
              <div class="form-group">
                <label class="label">Nomor Telepon</label>
                <div style="display:flex;gap:.5rem;max-width:360px">
                  <div class="input-icon" style="flex:1">
                    <i class="fa-solid fa-phone"></i>
                    <input class="input" id="phone-input" type="tel" placeholder="0812xxxxxxxx"
                      value="${escape(user.phone || "")}" data-testid="phone-input">
                  </div>
                  <button class="btn btn-primary" id="send-phone-otp" data-testid="send-phone-otp-btn">Kirim OTP</button>
                </div>
              </div>
              <div id="phone-otp-row" style="display:none;margin-top:.75rem">
                <div class="form-group">
                  <label class="label">Kode OTP SMS</label>
                  <div style="display:flex;gap:.5rem;max-width:320px">
                    <input class="input" id="phone-otp-input" maxlength="6" placeholder="123456" data-testid="phone-otp-input" style="letter-spacing:4px;font-size:1.2rem;text-align:center">
                    <button class="btn btn-primary" id="verify-phone-otp" data-testid="verify-phone-otp-btn">Verifikasi</button>
                  </div>
                </div>
              </div>
            </div>`
        }
      </div>

      <!-- STEP 3: KTP VERIFICATION -->
      <div class="card card-pad-lg mb-4">
        <div class="flex-between" style="align-items:center;flex-wrap:wrap;gap:1rem">
          <div>
            <h2 style="margin:0"><i class="fa-solid fa-id-card"></i> Verifikasi KTP</h2>
            <p class="text-muted" style="margin:.25rem 0 0">Diperlukan untuk menjual jasa (Level 2)</p>
          </div>
          ${getStatusLabel(ktpStatus)}
        </div>
        ${
          ktpStatus === "VERIFIED"
            ? `<div class="alert alert-success mt-3"><i class="fa-solid fa-circle-check"></i> KTP Anda sudah terverifikasi!</div>`
            : ktpStatus === "REJECTED"
              ? `<div class="alert alert-danger mt-3">
              <i class="fa-solid fa-circle-exclamation"></i> KTP ditolak: ${escape(vs.ktp?.rejectionReason || "Data tidak jelas")}
            </div>`
              : ktpStatus === "PENDING"
                ? `<div class="alert alert-warning mt-3">
              <i class="fa-solid fa-clock"></i> KTP sedang diproses oleh admin
            </div>`
                : `<form id="ktp-form" class="mt-3">
              <div class="alert alert-info mb-3">
                <i class="fa-solid fa-flask"></i> <strong>Mode Demo:</strong> Klik "Demo Instan" untuk verifikasi otomatis tanpa upload file.
              </div>
              <div class="form-group">
                <label class="label">Foto KTP (depan, maks 5MB)</label>
                <input type="file" id="ktp-file" accept="image/jpeg,image/png,image/jpg" class="input" data-testid="ktp-input">
                <div class="text-xs text-muted mt-1">Format JPG/PNG, pastikan foto jelas dan terbaca</div>
              </div>
              <div class="flex gap-sm mt-2" style="flex-wrap:wrap">
                <button type="submit" class="btn btn-primary" data-testid="ktp-submit-btn">
                  <i class="fa-solid fa-upload"></i> Upload KTP
                </button>
                <button type="button" class="btn btn-success" id="demo-ktp-btn" data-testid="demo-ktp-btn">
                  <i class="fa-solid fa-bolt"></i> Demo Instan
                </button>
              </div>
            </form>`
        }
      </div>

      <!-- STEP 4: BANK VERIFICATION -->
      <div class="card card-pad-lg mb-4">
        <div class="flex-between" style="align-items:center;flex-wrap:wrap;gap:1rem">
          <div>
            <h2 style="margin:0"><i class="fa-solid fa-building-columns"></i> Verifikasi Rekening Bank</h2>
            <p class="text-muted" style="margin:.25rem 0 0">Diperlukan untuk menarik saldo (Level 3)</p>
          </div>
          ${getStatusLabel(bankStatus)}
        </div>
        ${
          bankStatus === "VERIFIED"
            ? `<div class="alert alert-success mt-3">
              <i class="fa-solid fa-circle-check"></i> Rekening bank sudah terverifikasi!
              <div class="mt-2">
                <strong>Bank:</strong> ${escape(vs.bank?.bankName || user.bankName || "-")}<br>
                <strong>No. Rekening:</strong> ${escape(vs.bank?.accountNumber || user.accountNumber || "-")}<br>
                <strong>Atas Nama:</strong> ${escape(vs.bank?.accountName || user.accountName || "-")}
              </div>
            </div>`
            : bankStatus === "REJECTED"
              ? `<div class="alert alert-danger mt-3">
              <i class="fa-solid fa-circle-exclamation"></i> Rekening ditolak: ${escape(vs.bank?.rejectionReason || "Data tidak valid")}
            </div>`
              : bankStatus === "PENDING"
                ? `<div class="alert alert-warning mt-3">
              <i class="fa-solid fa-clock"></i> Rekening bank sedang diproses oleh admin
            </div>`
                : `<form id="bank-form" class="mt-3">
              <div class="alert alert-info mb-3">
                <i class="fa-solid fa-flask"></i> <strong>Mode Demo:</strong> Isi form lalu klik "Demo Instan".
              </div>
              <div class="grid grid-2">
                <div class="form-group">
                  <label class="label">Nama Bank</label>
                  <select id="bank-name" class="select" required data-testid="bank-name">
                    <option value="">Pilih Bank</option>
                    <option value="BCA">BCA</option>
                    <option value="Mandiri">Mandiri</option>
                    <option value="BNI">BNI</option>
                    <option value="BRI">BRI</option>
                    <option value="CIMB Niaga">CIMB Niaga</option>
                    <option value="Danamon">Danamon</option>
                    <option value="Permata">Permata</option>
                    <option value="Maybank">Maybank</option>
                    <option value="Other">Lainnya</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="label">Nomor Rekening</label>
                  <input type="text" id="account-number" class="input" placeholder="1234567890" required data-testid="account-number">
                </div>
              </div>
              <div class="form-group">
                <label class="label">Nama Pemilik Rekening</label>
                <input type="text" id="account-name" class="input" placeholder="Sesuai KTP" required data-testid="account-name">
              </div>
              <div class="form-group">
                <label class="label">Foto Buku Tabungan / Kartu ATM (opsional)</label>
                <input type="file" id="bank-file" accept="image/jpeg,image/png,image/jpg" class="input" data-testid="bank-file-input">
                <div class="text-xs text-muted mt-1">Bukti kepemilikan rekening (opsional di mode demo)</div>
              </div>
              <div class="flex gap-sm mt-2" style="flex-wrap:wrap">
                <button type="submit" class="btn btn-primary" data-testid="bank-submit-btn">
                  <i class="fa-solid fa-upload"></i> Submit Verifikasi Bank
                </button>
                <button type="button" class="btn btn-success" id="demo-bank-btn" data-testid="demo-bank-btn">
                  <i class="fa-solid fa-bolt"></i> Demo Instan
                </button>
              </div>
            </form>`
        }
      </div>
    </div>`;

  // ===== EMAIL OTP HANDLERS =====
  if (!emailDone) {
    const sendEmailBtn = document.getElementById("send-email-otp");
    const resendEmailBtn = document.getElementById("resend-email-otp");
    const otpRow = document.getElementById("email-otp-row");

    const requestEmailOtp = async () => {
      try {
        const r = await api.post("/verification/email/request", {});
        if (r.demoOtp) {
          toast(`Demo OTP: ${r.demoOtp} (berlaku 10 menit)`, "info", 12000);
          console.log(`[DEMO] Email OTP: ${r.demoOtp}`);
        } else {
          toast("OTP dikirim ke email Anda", "success");
        }
        if (otpRow) otpRow.style.display = "";
      } catch (err) {
        toast(err.message, "error");
      }
    };

    sendEmailBtn?.addEventListener("click", requestEmailOtp);
    resendEmailBtn?.addEventListener("click", requestEmailOtp);

    document
      .getElementById("verify-email-otp")
      ?.addEventListener("click", async () => {
        const otp = document.getElementById("email-otp-input")?.value.trim();
        if (!otp || otp.length < 6)
          return toast("Masukkan kode OTP 6 digit", "error");
        try {
          await api.post("/verification/email/verify", { otp });
          const u = store.getState().user;
          if (u) store.setState({ user: { ...u, emailVerified: true } });
          toast("Email berhasil diverifikasi!", "success");
          setTimeout(() => router.render(), 1000);
        } catch (err) {
          toast(err.message, "error");
        }
      });
  }

  // ===== PHONE OTP HANDLERS =====
  if (!phoneDone) {
    document
      .getElementById("send-phone-otp")
      ?.addEventListener("click", async () => {
        const phone = document.getElementById("phone-input")?.value.trim();
        if (!phone || phone.length < 9)
          return toast("Masukkan nomor telepon yang valid", "error");
        try {
          const r = await api.post("/verification/phone/request", { phone });
          if (r.demoOtp) {
            toast(`Demo OTP: ${r.demoOtp} (berlaku 10 menit)`, "info", 12000);
            console.log(`[DEMO] Phone OTP: ${r.demoOtp}`);
          } else {
            toast("OTP dikirim via SMS", "success");
          }
          const phoneOtpRow = document.getElementById("phone-otp-row");
          if (phoneOtpRow) phoneOtpRow.style.display = "";
        } catch (err) {
          toast(err.message, "error");
        }
      });

    document
      .getElementById("verify-phone-otp")
      ?.addEventListener("click", async () => {
        const otp = document.getElementById("phone-otp-input")?.value.trim();
        if (!otp || otp.length < 6)
          return toast("Masukkan kode OTP 6 digit", "error");
        const phone = document.getElementById("phone-input")?.value.trim();
        try {
          await api.post("/verification/phone/verify", { otp, phone });
          const u = store.getState().user;
          if (u) store.setState({ user: { ...u, phoneVerified: true, phone } });
          toast("Nomor telepon berhasil diverifikasi!", "success");
          setTimeout(() => router.render(), 1000);
        } catch (err) {
          toast(err.message, "error");
        }
      });
  }

  // ===== DEMO KTP =====
  document
    .getElementById("demo-ktp-btn")
    ?.addEventListener("click", async () => {
      try {
        await api.post("/verification/demo/ktp", {});
        toast("✅ KTP berhasil diverifikasi (mode demo)!", "success");
        setTimeout(() => router.render(), 1200);
      } catch (err) {
        toast(err.message, "error");
      }
    });

  // ===== DEMO BANK =====
  document
    .getElementById("demo-bank-btn")
    ?.addEventListener("click", async () => {
      const bankName = document.getElementById("bank-name")?.value;
      const accountNumber = document.getElementById("account-number")?.value;
      const accountName = document.getElementById("account-name")?.value;
      if (!bankName) return toast("Pilih nama bank dulu", "error");
      if (!accountNumber || accountNumber.length < 5)
        return toast("Nomor rekening minimal 5 digit", "error");
      if (!accountName || accountName.length < 3)
        return toast("Nama pemilik minimal 3 karakter", "error");
      try {
        await api.post("/verification/demo/bank", {
          bankName,
          accountNumber,
          accountName,
        });
        toast("✅ Rekening bank berhasil diverifikasi (mode demo)!", "success");
        setTimeout(() => router.render(), 1200);
      } catch (err) {
        toast(err.message, "error");
      }
    });

  // ===== REAL KTP UPLOAD =====
  const ktpForm = document.getElementById("ktp-form");
  if (ktpForm) {
    ktpForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const file = document.getElementById("ktp-file")?.files[0];
      if (!file) return toast("Pilih file KTP terlebih dahulu", "error");
      if (file.size > 5 * 1024 * 1024)
        return toast("Ukuran file maksimal 5MB", "error");
      const btn = e.target.querySelector("button[type=submit]");
      btn.disabled = true;
      btn.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';
      const fd = new FormData();
      fd.append("ktpImage", file);
      try {
        await api.post("/verification/ktp", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast("KTP diupload, menunggu verifikasi admin", "success");
        setTimeout(() => router.render(), 1500);
      } catch (err) {
        toast(err.message, "error");
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-upload"></i> Upload KTP';
      }
    });
  }

  // ===== REAL BANK SUBMIT =====
  const bankForm = document.getElementById("bank-form");
  if (bankForm) {
    bankForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const bankName = document.getElementById("bank-name")?.value;
      const accountNumber = document.getElementById("account-number")?.value;
      const accountName = document.getElementById("account-name")?.value;
      const file = document.getElementById("bank-file")?.files[0];

      if (!bankName) return toast("Pilih nama bank", "error");
      if (!accountNumber || accountNumber.length < 5)
        return toast("Nomor rekening minimal 5 digit", "error");
      if (!accountName || accountName.length < 3)
        return toast("Nama pemilik minimal 3 karakter", "error");

      const btn = e.target.querySelector("button[type=submit]");
      btn.disabled = true;
      btn.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

      const fd = new FormData();
      fd.append("bankName", bankName);
      fd.append("accountNumber", accountNumber);
      fd.append("accountName", accountName);
      if (file) fd.append("bankProof", file);

      try {
        await api.post("/verification/bank", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast("Verifikasi bank submitted, menunggu admin", "success");
        setTimeout(() => router.render(), 1500);
      } catch (err) {
        toast(err.message, "error");
        btn.disabled = false;
        btn.innerHTML =
          '<i class="fa-solid fa-upload"></i> Submit Verifikasi Bank';
      }
    });
  }
}

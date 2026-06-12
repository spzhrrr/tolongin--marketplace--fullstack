// KYC page — seller identity verification submission
import { api } from "../../shared/utils/api.js";
import { store } from "../../app/store.js";
import { toast, escape } from "../../shared/utils/helpers.js";
import { mountImageUpload } from "../../shared/utils/upload-widget.js";
import { empty } from "../../shared/ui/components.js";

const statusLabels = {
  not_submitted: { label: "Belum Dikirim", icon: "fa-circle-question" },
  pending: { label: "Menunggu Review", icon: "fa-hourglass-half" },
  approved: { label: "Terverifikasi", icon: "fa-circle-check" },
  rejected: { label: "Ditolak", icon: "fa-circle-xmark" },
};

export async function KycPage({ mount }) {
  const u = store.getState().user;
  if (!u || u.role !== "SELLER") {
    mount.innerHTML = empty(
      "Hanya seller yang perlu KYC",
      "Buyer tidak perlu melakukan verifikasi identitas.",
    );
    return;
  }
  mount.innerHTML = `<div class="container-sm page"><div class="spinner"></div></div>`;
  let kyc;
  try {
    kyc = await api.get("/kyc/me");
  } catch (e) {
    kyc = { status: "not_submitted", data: {} };
  }
  const status = kyc.status || "not_submitted";
  const data = kyc.data || {};
  const meta = statusLabels[status] || statusLabels.not_submitted;
  const readonly = status === "pending" || status === "approved";

  mount.innerHTML = `
    <div class="container-sm page">
      <h1 class="page-title">Verifikasi Identitas (KYC)</h1>
      <p class="page-subtitle">Verifikasi diperlukan untuk menerima pembayaran dan membangun kepercayaan pembeli.</p>
      <div class="card card-pad-lg">
        <div class="flex-between mb-2">
          <strong>Status</strong>
          <span class="kyc-status ${status}" data-testid="kyc-status"><i class="fa-solid ${meta.icon}"></i> ${meta.label}</span>
        </div>
        ${status === "rejected" && data.rejectReason ? `<div class="card card-pad" style="background:#fef2f2;border:1px solid #fecaca;margin-bottom:1rem"><strong>Alasan ditolak:</strong> ${escape(data.rejectReason)}</div>` : ""}
        <form id="kyc-form" data-testid="kyc-form">
          <div class="form-group"><label class="label">Nama Lengkap (sesuai KTP)</label><input class="input" id="fullName" required ${readonly ? "disabled" : ""} value="${escape(data.fullName || u.name)}" data-testid="kyc-fullname"></div>
          <div class="form-group"><label class="label">Nomor KTP (16 digit)</label><input class="input" id="ktpNumber" required ${readonly ? "disabled" : ""} minlength="10" maxlength="20" value="${escape(data.ktpNumber || "")}" placeholder="3201..." data-testid="kyc-ktp-number"></div>
          <div class="form-group">
            <label class="label">Foto KTP</label>
            <div id="ktp-upload"></div>
          </div>
          <div class="form-group">
            <label class="label">Selfie dengan KTP</label>
            <div id="selfie-upload"></div>
          </div>
          <h3 style="margin-top:2rem">Rekening Bank (untuk pencairan)</h3>
          <div class="grid grid-2">
            <div class="form-group"><label class="label">Nama Bank</label><input class="input" id="bankName" required ${readonly ? "disabled" : ""} value="${escape(data.bankName || "")}" placeholder="BCA, Mandiri..." data-testid="kyc-bank"></div>
            <div class="form-group"><label class="label">Nomor Rekening</label><input class="input" id="bankAccountNumber" required ${readonly ? "disabled" : ""} minlength="5" value="${escape(data.bankAccountNumber || "")}" data-testid="kyc-bank-number"></div>
          </div>
          <div class="form-group"><label class="label">Nama Pemilik Rekening</label><input class="input" id="bankAccountName" required ${readonly ? "disabled" : ""} value="${escape(data.bankAccountName || "")}" data-testid="kyc-bank-name"></div>
          ${readonly ? "" : `<button class="btn btn-primary btn-lg btn-block" type="submit" data-testid="kyc-submit-btn">${status === "rejected" ? "Kirim Ulang" : "Kirim untuk Verifikasi"}</button>`}
        </form>
      </div>
    </div>`;

  let ktpPhoto = data.ktpPhoto || "";
  let ktpSelfie = data.ktpSelfie || "";
  if (!readonly) {
    mountImageUpload(document.getElementById("ktp-upload"), {
      folder: "kyc",
      initial: ktpPhoto,
      name: "ktp-img",
      testid: "kyc-ktp-upload",
      onChange: (u) => {
        ktpPhoto = u;
      },
    });
    mountImageUpload(document.getElementById("selfie-upload"), {
      folder: "kyc",
      initial: ktpSelfie,
      name: "selfie-img",
      testid: "kyc-selfie-upload",
      onChange: (u) => {
        ktpSelfie = u;
      },
    });
  } else {
    document.getElementById("ktp-upload").innerHTML = ktpPhoto
      ? `<img src="${escape(ktpPhoto)}" class="upload-preview" alt="KTP"/>`
      : '<div class="text-muted">Belum diunggah</div>';
    document.getElementById("selfie-upload").innerHTML = ktpSelfie
      ? `<img src="${escape(ktpSelfie)}" class="upload-preview" alt="Selfie"/>`
      : '<div class="text-muted">Belum diunggah</div>';
  }

  const form = document.getElementById("kyc-form");
  if (form && !readonly) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!ktpPhoto) return toast("Foto KTP wajib diunggah", "error");
      if (!ktpSelfie) return toast("Selfie wajib diunggah", "error");
      const payload = {
        fullName: document.getElementById("fullName").value.trim(),
        ktpNumber: document.getElementById("ktpNumber").value.trim(),
        bankName: document.getElementById("bankName").value.trim(),
        bankAccountNumber: document
          .getElementById("bankAccountNumber")
          .value.trim(),
        bankAccountName: document
          .getElementById("bankAccountName")
          .value.trim(),
        ktpPhoto,
        ktpSelfie,
      };
      try {
        await api.post("/kyc/submit", payload);
        toast("KYC berhasil dikirim untuk review", "success");
        store.setState({
          user: { ...store.getState().user, kycStatus: "pending" },
        });
        setTimeout(() => KycPage({ mount }), 500);
      } catch (err) {
        toast(err.message, "error");
      }
    });
  }
}

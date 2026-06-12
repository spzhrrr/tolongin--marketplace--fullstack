// frontend/src/features/profile/ProfilePages.js

import { api } from "../../shared/utils/api.js";
import { escape, toast } from "../../shared/utils/helpers.js";
import { avatar, serviceCard, empty } from "../../shared/ui/components.js";
import { store } from "../../app/store.js";

export async function ProfilePage({ mount }) {
  mount.innerHTML = `<div class="container page"><div class="spinner"></div></div>`;
  try {
    const me = await api.get("/auth/me");
    const servicesResp = await api
      .get("/services?sellerId=" + me.id)
      .catch(() => []);
    const services = Array.isArray(servicesResp)
      ? servicesResp
      : servicesResp.data || [];

    mount.innerHTML = `
      <div class="container page">
        <div class="card card-pad-lg" data-testid="profile-card">
          <div class="flex gap-md" style="align-items:center;flex-wrap:wrap">
            ${avatar(me, "xl")}
            <div style="flex:1;min-width:200px">
              <div class="flex gap-sm" style="align-items:center">
                <h1 style="margin:0">${escape(me.name)}</h1>
                ${me.verified ? '<i class="fa-solid fa-circle-check" style="color:var(--primary)" title="Verified"></i>' : ""}
              </div>
              <p class="text-muted" style="margin:.25rem 0">${escape(me.bio || "Belum ada bio")}</p>
              <div class="flex gap-md text-sm text-muted" style="flex-wrap:wrap">
                <span><i class="fa-solid fa-envelope"></i> ${escape(me.email)}</span>
                <span><i class="fa-solid fa-location-dot"></i> ${escape(me.city || "-")}</span>
                <span class="badge">${me.role === "ADMIN" ? "Administrator" : "Pengguna"}</span>
                <span><i class="fa-solid fa-star" style="color:var(--warning)"></i> ${(me.rating || 0).toFixed(1)} (${me.reviewCount || 0} ulasan)</span>
              </div>
            </div>
            <div class="flex gap-sm" style="flex-wrap:wrap">
              <a class="btn btn-secondary" href="#/users/${me.id}" data-testid="view-public-profile-btn">
                <i class="fa-solid fa-eye"></i> Lihat Profil Publik
              </a>
              <a class="btn btn-primary" href="#/settings" data-testid="edit-profile-btn">
                <i class="fa-solid fa-pen"></i> Edit Profil
              </a>
            </div>
          </div>
        </div>
        ${
          services.length
            ? `
          <h2 class="mt-4">Jasa Saya</h2>
          <div class="services-grid">${services.map((s) => serviceCard(s)).join("")}</div>
        `
            : ""
        }
      </div>
    `;
  } catch (e) {
    mount.innerHTML = empty("Gagal memuat profil", e.message);
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });
}

// frontend/src/features/profile/ProfilePages.js - SettingsPage

export async function SettingsPage({ mount }) {
  const u = store.getState().user;

  mount.innerHTML = `
    <div class="container-sm page">
      <h1 class="page-title">Pengaturan Profil</h1>
      <div class="card card-pad-lg">
        <form id="s-form" data-testid="settings-form">
          <div class="form-group text-center">
            <label class="label" style="display:block">Foto Profil</label>
            <div style="position:relative;display:inline-block">
              <img id="avatar-preview" 
                   src="${u.avatar && u.avatar !== "null" ? escape(u.avatar) : `https://i.pravatar.cc/150?u=${u.id}`}"
                   alt="avatar"
                   style="width:120px;height:120px;border-radius:50%;object-fit:cover;border:3px solid var(--border);display:block;margin:0 auto"
                   data-testid="avatar-preview" />
              <label for="avatar-file" class="btn btn-primary btn-sm"
                     style="position:absolute;bottom:0;right:0;border-radius:50%;width:36px;height:36px;padding:0;cursor:pointer;display:grid;place-items:center"
                     data-testid="avatar-upload-btn">
                <i class="fa-solid fa-camera"></i>
              </label>
              <input type="file" id="avatar-file" accept="image/jpeg,image/png,image/webp" style="display:none" data-testid="avatar-file-input" />
            </div>
            <div class="text-xs text-muted mt-1">JPG, PNG atau WebP. Maks 2MB.</div>
            <div id="avatar-upload-status" style="font-size:12px; color:#666; margin-top:8px; display:none;"></div>
          </div>
          <div class="form-group">
            <label class="label">Nama</label>
            <input class="input" id="name" value="${escape(u.name)}" data-testid="set-name">
          </div>
          <div class="form-group">
            <label class="label">Bio</label>
            <textarea class="textarea" id="bio" rows="3" maxlength="500" data-testid="set-bio" placeholder="Ceritakan tentang Anda...">${escape(u.bio || "")}</textarea>
          </div>
          <div class="form-group">
            <label class="label">Kota</label>
            <input class="input" id="city" value="${escape(u.city || "")}" placeholder="Contoh: Jakarta Selatan" data-testid="set-city">
          </div>
          <div class="form-group">
            <label class="label">Nomor Telepon</label>
            <input class="input" id="phone" value="${escape(u.phone || "")}" placeholder="0812xxxxxxxx" data-testid="set-phone">
          </div>
          <button class="btn btn-primary btn-block" type="submit" data-testid="settings-save-btn">
            <i class="fa-solid fa-floppy-disk"></i> Simpan Perubahan
          </button>
        </form>
      </div>
    </div>`;

  let avatarFileToUpload = null;
  const uploadStatus = document.getElementById("avatar-upload-status");

  // Avatar upload via file input - UPLOAD LANGSUNG KE SERVER
  const avatarFileInput = document.getElementById("avatar-file");
  if (avatarFileInput) {
    avatarFileInput.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        return toast("File harus berupa gambar", "error");
      }
      if (file.size > 2 * 1024 * 1024) {
        return toast("Ukuran maksimal 2MB", "error");
      }

      // Preview lokal dulu
      const reader = new FileReader();
      reader.onload = (event) => {
        const preview = document.getElementById("avatar-preview");
        if (preview) preview.src = event.target.result;
      };
      reader.readAsDataURL(file);

      // Upload langsung ke server
      if (uploadStatus) {
        uploadStatus.style.display = "block";
        uploadStatus.innerHTML =
          '<i class="fa-solid fa-spinner fa-spin"></i> Mengupload foto...';
      }

      try {
        const formData = new FormData();
        formData.append("file", file);
                const uploadResult = await api.post("/uploads?folder=avatars", formData);

        const uploadedUrl =
          uploadResult.url || uploadResult.secure_url || uploadResult.fileUrl;

        if (uploadStatus) {
          uploadStatus.innerHTML =
            '<i class="fa-solid fa-check-circle" style="color:#10b981;"></i> Foto berhasil diupload!';
          setTimeout(() => {
            if (uploadStatus) uploadStatus.style.display = "none";
          }, 2000);
        }

        // Simpan URL untuk dikirim saat submit form
        avatarFileToUpload = uploadedUrl;

        // Update preview dengan URL dari server
        const preview = document.getElementById("avatar-preview");
        if (preview) preview.src = uploadedUrl;

        toast(
          "Foto berhasil diupload. Klik Simpan untuk menyimpan perubahan.",
          "success",
        );
      } catch (err) {
        console.error("Upload avatar error:", err);
        if (uploadStatus) {
          uploadStatus.innerHTML =
            '<i class="fa-solid fa-exclamation-circle" style="color:#ef4444;"></i> Gagal upload foto';
          setTimeout(() => {
            if (uploadStatus) uploadStatus.style.display = "none";
          }, 3000);
        }
        toast("Gagal upload foto: " + (err.message || "Coba lagi"), "error");
      }
    });
  }

  const form = document.getElementById("s-form");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = form.querySelector("button[type=submit]");
      if (btn) {
        btn.disabled = true;
        btn.innerHTML =
          '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
      }

      try {
        const payload = {
          name: document.getElementById("name")?.value.trim() || "",
          bio: document.getElementById("bio")?.value.trim() || "",
          city: document.getElementById("city")?.value.trim() || "",
          phone: document.getElementById("phone")?.value.trim() || "",
        };

        // Gunakan URL yang sudah diupload (bukan base64)
        if (avatarFileToUpload) {
          payload.avatar = avatarFileToUpload;
        }

        const updated = await api.put("/users/me", payload);
        store.setState({ user: updated });
        toast("Profil berhasil diperbarui", "success");
        avatarFileToUpload = null;

        // Redirect ke profile setelah update
        setTimeout(() => {
          window.location.hash = "#/profile";
        }, 1200);
      } catch (err) {
        toast(err.message || "Gagal menyimpan", "error");
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML =
            '<i class="fa-solid fa-floppy-disk"></i> Simpan Perubahan';
        }
      }
    });
  }
}

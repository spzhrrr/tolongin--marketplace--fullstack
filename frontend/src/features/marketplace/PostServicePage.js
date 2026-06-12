// frontend/src/features/marketplace/PostServicePage.js

import { api } from "../../shared/utils/api.js";
import { escape, fmtIDR, toast } from "../../shared/utils/helpers.js";
import { store } from "../../app/store.js";
import { router } from "../../app/router.js";

export async function PostServicePage({ mount }) {
  const u = store.getState().user;

  // Redirect jika belum login
  if (!u) {
    toast("Silakan login dulu", "warning");
    router.navigate("/login");
    return;
  }

  const cats = await api.get("/categories");

  mount.innerHTML = `
    <div class="container-sm page">
      <a href="#/marketplace" class="text-sm" style="display:inline-block; margin-bottom:20px; text-decoration:none; color:#0a66c2;">
        <i class="fa-solid fa-arrow-left"></i> Kembali ke Marketplace
      </a>
      <div class="card card-pad-lg">
        <div class="page-header" style="margin-bottom:24px;">
          <h1 class="page-title" style="margin:0;">Posting Jasa Baru</h1>
          <p class="page-subtitle">Tawarkan keahlian Anda kepada ribuan klien</p>
        </div>
        
        <form id="service-form" data-testid="post-service-form">
          <div class="form-group">
            <label class="label">Judul Jasa *</label>
            <input class="input" id="title" required placeholder="Contoh: Desain Logo Profesional" data-testid="service-title">
            <div class="text-xs text-muted">Minimal 5 karakter, jelaskan jasa Anda dengan jelas</div>
          </div>
          
          <div class="form-group">
            <label class="label">Kategori *</label>
            <select class="select" id="categoryId" required data-testid="service-category">
              <option value="">Pilih Kategori</option>
              ${cats.map((c) => `<option value="${c.id}">${escape(c.name)}</option>`).join("")}
            </select>
          </div>
          
          <div class="form-group">
            <label class="label">Deskripsi Jasa *</label>
            <textarea class="textarea" id="description" rows="6" required placeholder="Jelaskan detail jasa yang Anda tawarkan, termasuk apa yang akan didapatkan klien..." data-testid="service-description"></textarea>
            <div class="text-xs text-muted">Minimal 20 karakter</div>
          </div>
          
          <div class="grid grid-2">
            <div class="form-group">
              <label class="label">Harga (Rp) *</label>
              <input class="input" id="price" type="number" required placeholder="150000" min="10000" step="1000" data-testid="service-price">
              <div class="text-xs text-muted">Minimal Rp 10.000</div>
            </div>
            <div class="form-group">
              <label class="label">Hari Pengerjaan *</label>
              <input class="input" id="deliveryTime" type="number" required placeholder="3" min="1" max="30" data-testid="service-delivery">
              <div class="text-xs text-muted">1-30 hari</div>
            </div>
          </div>
          
          <div class="form-group">
            <label class="label">Kota</label>
            <input class="input" id="city" placeholder="Contoh: Jakarta Selatan / Remote" data-testid="service-city">
          </div>
          
          <div class="form-group">
            <label class="label">Gambar Cover</label>
            <div style="border:2px dashed #ddd; border-radius:16px; padding:20px; text-align:center; cursor:pointer;" id="upload-zone">
              <i class="fa-solid fa-cloud-upload-alt" style="font-size:2rem; color:#999;"></i>
              <p style="margin:8px 0 0; color:#666;">Klik untuk upload gambar</p>
              <input type="file" id="imageFile" accept="image/*" style="display:none;">
              <input type="hidden" id="imageUrl">
            </div>
            <div id="image-preview" style="display:none; margin-top:12px;">
              <img id="preview-img" src="" style="max-width:100%; max-height:150px; border-radius:12px;">
              <button type="button" id="remove-image" class="btn btn-sm btn-ghost" style="margin-top:8px;"><i class="fa-solid fa-trash"></i> Hapus</button>
            </div>
          </div>
          
          <div style="display:flex; gap:12px; justify-content:flex-end; margin-top:24px; padding-top:16px; border-top:1px solid #eee;">
            <a href="#/marketplace" class="btn btn-secondary" style="padding:10px 24px;">Batal</a>
            <button class="btn btn-primary" type="submit" style="padding:10px 24px;" data-testid="service-submit">
              <i class="fa-solid fa-save"></i> Posting Jasa
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Image upload handler
  const uploadZone = document.getElementById("upload-zone");
  const imageFile = document.getElementById("imageFile");
  const imageUrlInput = document.getElementById("imageUrl");
  const imagePreview = document.getElementById("image-preview");
  const previewImg = document.getElementById("preview-img");
  const removeImage = document.getElementById("remove-image");
  const uploadStatus = document.createElement("div");
  uploadStatus.style.cssText =
    "margin-top:8px; font-size:12px; color:#666; display:none;";
  if (uploadZone) uploadZone.parentNode.appendChild(uploadStatus);

  if (uploadZone) {
    uploadZone.addEventListener("click", () => imageFile.click());
  }

  if (imageFile) {
    imageFile.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        toast("File harus berupa gambar", "error");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast("Ukuran file maksimal 2MB", "error");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (previewImg) previewImg.src = event.target.result;
        if (imagePreview) imagePreview.style.display = "block";
        if (uploadZone) uploadZone.style.display = "none";
      };
      reader.readAsDataURL(file);

      uploadStatus.style.display = "block";
      uploadStatus.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> Mengupload gambar...';

      try {
        const formData = new FormData();
        formData.append("file", file);
                const uploadResult = await api.post("/uploads?folder=services", formData);
        const uploadedUrl =
          uploadResult.url || uploadResult.secure_url || uploadResult.fileUrl;
        if (imageUrlInput) imageUrlInput.value = uploadedUrl;
        uploadStatus.innerHTML =
          '<i class="fa-solid fa-check-circle" style="color:#10b981;"></i> Gambar berhasil diupload!';
        setTimeout(() => {
          uploadStatus.style.display = "none";
        }, 2000);
      } catch (err) {
        console.error("Upload error:", err);
        uploadStatus.innerHTML =
          '<i class="fa-solid fa-exclamation-circle" style="color:#ef4444;"></i> Gagal upload gambar';
        toast("Gagal upload gambar: " + (err.message || "Coba lagi"), "error");
        if (imagePreview) imagePreview.style.display = "none";
        if (uploadZone) uploadZone.style.display = "block";
        if (imageUrlInput) imageUrlInput.value = "";
      }
    });
  }

  if (removeImage) {
    removeImage.addEventListener("click", () => {
      if (imagePreview) imagePreview.style.display = "none";
      if (uploadZone) uploadZone.style.display = "block";
      if (imageUrlInput) imageUrlInput.value = "";
      if (imageFile) imageFile.value = "";
      uploadStatus.style.display = "none";
    });
  }

  // Form submission
  const form = document.getElementById("service-form");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const title = document.getElementById("title")?.value.trim();
      const categoryId = document.getElementById("categoryId")?.value;
      const description = document.getElementById("description")?.value.trim();
      const price = parseFloat(document.getElementById("price")?.value);
      const deliveryTime = parseInt(
        document.getElementById("deliveryTime")?.value,
      );
      const city = document.getElementById("city")?.value.trim();
      const image =
        imageUrlInput?.value.trim() ||
        "https://placehold.co/600x400/0a66c2/ffffff?text=No+Image";

      if (!title || title.length < 5) {
        toast("Judul minimal 5 karakter", "error");
        return;
      }
      if (!categoryId) {
        toast("Pilih kategori", "error");
        return;
      }
      if (!description || description.length < 20) {
        toast("Deskripsi minimal 20 karakter", "error");
        return;
      }
      if (!price || isNaN(price) || price < 10000) {
        toast("Harga minimal Rp 10.000", "error");
        return;
      }
      if (
        !deliveryTime ||
        isNaN(deliveryTime) ||
        deliveryTime < 1 ||
        deliveryTime > 30
      ) {
        toast("Hari pengerjaan harus 1-30 hari", "error");
        return;
      }

      const submitBtn = form.querySelector("[type=submit]");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML =
          '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
      }

      try {
        await api.post("/services", {
          title,
          categoryId,
          description,
          price,
          deliveryTime,
          location: city || "Remote",
          images: [image],
        });
        toast("✅ Jasa berhasil diposting!", "success");
        router.navigate("/marketplace");
      } catch (err) {
        console.error("Create service error:", err);
        toast(err.message || "Gagal memposting jasa", "error");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = "Posting Jasa";
        }
      }
    });
  }
}

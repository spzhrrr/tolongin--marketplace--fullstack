// Drag & drop image upload widget
// Returns hosted URL via Cloudinary if configured, otherwise base64 data URL (mock).
import { uploadFile } from "./uploads.js";
import { escape } from "./helpers.js";
import { api } from "./api.js";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

let cloudinaryConfigured = null;
async function isCloudinaryConfigured() {
  if (cloudinaryConfigured !== null) return cloudinaryConfigured;
  try {
    const s = await api.get("/integrations/status");
    cloudinaryConfigured = !!s.cloudinary;
  } catch (_) {
    cloudinaryConfigured = false;
  }
  return cloudinaryConfigured;
}

function readDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Render a drag-drop image picker inside `containerEl`.
 * options: { folder, initial, name, testid, onChange(url) }
 * Returns: { getValue, setValue, destroy }
 */
export function mountImageUpload(containerEl, options = {}) {
  const folder = options.folder || "images";
  const testid = options.testid || "image-upload";
  const name = options.name || "image";
  let currentUrl = options.initial || "";

  const render = () => {
    containerEl.innerHTML = `
      <div class="upload-zone ${currentUrl ? "has-image" : ""}" data-testid="${escape(testid)}-zone">
        ${
          currentUrl
            ? `<img src="${escape(currentUrl)}" class="upload-preview" alt="preview"/>`
            : `
          <div class="upload-placeholder">
            <i class="fa-solid fa-cloud-arrow-up"></i>
            <div><strong>Klik atau seret gambar ke sini</strong></div>
            <div class="text-xs text-muted">JPG, PNG, WEBP — max 5MB</div>
          </div>`
        }
        <input type="file" id="${name}-file" accept="image/*" hidden data-testid="${escape(testid)}-input">
        <div class="upload-actions">
          <button type="button" class="btn btn-secondary btn-sm" data-pick data-testid="${escape(testid)}-pick"><i class="fa-solid fa-image"></i> Pilih File</button>
          ${currentUrl ? `<button type="button" class="btn btn-ghost btn-sm" data-clear data-testid="${escape(testid)}-clear"><i class="fa-solid fa-xmark"></i> Hapus</button>` : ""}
        </div>
        <div class="upload-progress" hidden><div class="bar"></div></div>
      </div>
      <details class="mt-1">
        <summary class="text-xs text-muted" style="cursor:pointer">Atau gunakan URL gambar</summary>
        <input type="url" class="input mt-1" placeholder="https://..." value="${escape(currentUrl)}" data-url-input data-testid="${escape(testid)}-url">
      </details>
    `;
    const zone = containerEl.querySelector(".upload-zone");
    const fileInput = containerEl.querySelector("input[type=file]");
    const urlInput = containerEl.querySelector("[data-url-input]");
    const progress = containerEl.querySelector(".upload-progress");

    const setUrl = (u) => {
      currentUrl = u || "";
      if (options.onChange) options.onChange(currentUrl);
      render();
    };

    const handleFile = async (file) => {
      if (!file) return;
      if (!ALLOWED.includes(file.type)) {
        window.dispatchEvent(
          new CustomEvent("toast", {
            detail: {
              type: "error",
              text: "Format tidak didukung — gunakan JPG/PNG/WEBP/GIF",
            },
          }),
        );
        return;
      }
      if (file.size > MAX_BYTES) {
        window.dispatchEvent(
          new CustomEvent("toast", {
            detail: { type: "error", text: "File terlalu besar (max 5MB)" },
          }),
        );
        return;
      }
      progress.hidden = false;
      progress.querySelector(".bar").style.width = "40%";
      try {
        let url;
        if (await isCloudinaryConfigured()) {
          const r = await uploadFile(file, folder);
          url = r.url;
        } else {
          // Mock fallback — base64 data URL stored client-side
          url = await readDataUrl(file);
        }
        progress.querySelector(".bar").style.width = "100%";
        setTimeout(() => setUrl(url), 200);
      } catch (err) {
        window.dispatchEvent(
          new CustomEvent("toast", {
            detail: { type: "error", text: "Upload gagal: " + err.message },
          }),
        );
        progress.hidden = true;
      }
    };

    containerEl
      .querySelector("[data-pick]")
      .addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (e) => handleFile(e.target.files[0]));
    const clearBtn = containerEl.querySelector("[data-clear]");
    if (clearBtn) clearBtn.addEventListener("click", () => setUrl(""));
    if (urlInput) {
      urlInput.addEventListener("change", (e) => setUrl(e.target.value.trim()));
    }
    // Drag & drop
    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      zone.classList.add("drag-over");
    });
    zone.addEventListener("dragleave", () =>
      zone.classList.remove("drag-over"),
    );
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("drag-over");
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    });
    // Click on placeholder = pick
    const placeholder = containerEl.querySelector(".upload-placeholder");
    if (placeholder)
      placeholder.addEventListener("click", () => fileInput.click());
  };

  render();

  return {
    getValue: () => currentUrl,
    setValue: (u) => {
      currentUrl = u || "";
      render();
    },
    destroy: () => {
      containerEl.innerHTML = "";
    },
  };
}

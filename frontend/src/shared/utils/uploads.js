// Cloudinary signed upload helper
import { api, API } from "./api.js";
import { store } from "../../app/store.js";

export async function uploadFile(file, folder = "chat") {
  if (!file) throw new Error("No file");
  if (file.size > 10 * 1024 * 1024) throw new Error("Max 10MB");
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  const resource_type = isImage ? "image" : isVideo ? "video" : "raw";

  const sig = await api.get(
    `/uploads/signature?resource_type=${resource_type}&folder=${folder}`,
  );

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.api_key);
  form.append("timestamp", sig.timestamp);
  form.append("signature", sig.signature);
  form.append("folder", sig.folder);

  const url = `https://api.cloudinary.com/v1_1/${sig.cloud_name}/${resource_type}/upload`;
  const res = await fetch(url, { method: "POST", body: form });
  if (!res.ok) {
    const t = await res.text();
    throw new Error("Cloudinary upload gagal: " + t.slice(0, 100));
  }
  const data = await res.json();
  return {
    url: data.secure_url,
    publicId: data.public_id,
    type: data.resource_type,
    format: data.format,
    name: file.name,
    size: file.size,
    bytes: data.bytes,
  };
}

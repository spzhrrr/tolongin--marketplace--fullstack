import "./styles/main.css";
import { bootstrap } from "./app/App.js";
import "./shared/utils/ws.js"; // auto-connect WebSocket saat pengguna terautentikasi

// Bootstrap aplikasi tepat satu kali (hindari render & listener ganda).
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}

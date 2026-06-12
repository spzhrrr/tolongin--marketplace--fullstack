import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    server: {
      host: "0.0.0.0",
      port: 3000,
      strictPort: true,
      hmr: { clientPort: 443, protocol: "wss" },
      allowedHosts: true,
      watch: { usePolling: true },
    },
    define: {
      "import.meta.env.VITE_BACKEND_URL": JSON.stringify(
        env.REACT_APP_BACKEND_URL || "http://localhost:8001",
      ),
    },
  };
});

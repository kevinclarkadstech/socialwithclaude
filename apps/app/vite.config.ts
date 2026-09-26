import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { nitro } from "nitro/vite";

const API_DEV_PORT = 8787;

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // nitro's dev integration serves client + server on one port; we don't want
  // that anymore since the API is deployed separately from the static client
  // build. Only pull it in for `vite build`, where it still produces the
  // deployable `.output/server` bundle.
  plugins: [react(), tailwindcss(), command === "build" && nitro()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: `http://localhost:${API_DEV_PORT}`,
        changeOrigin: true,
      },
    },
  },
}))

import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    // Same origin as the app in dev, so auth cookies need no CORS setup.
    // Point BETTER_AUTH_URL in apps/api at this server (http://localhost:5173).
    proxy: {
      "/api": process.env.API_DEV_URL ?? "http://localhost:3000",
    },
  },
})

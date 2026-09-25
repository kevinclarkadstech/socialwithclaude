import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { nitro } from "nitro/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), nitro()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
})

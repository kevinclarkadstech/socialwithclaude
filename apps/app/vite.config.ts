/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy()
  ],
  resolve: {
    alias: {
      // The push plugin's web version imports the Firebase JS SDK, which the app doesn't use
      // (push is native only), so it gets a small stand-in instead of the whole SDK.
      'firebase/messaging': fileURLToPath(new URL('./src/lib/stubs/firebaseMessaging.ts', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  }
})

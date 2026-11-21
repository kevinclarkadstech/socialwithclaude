/// <reference types="vitest" />

import { sentryVitePlugin } from '@sentry/vite-plugin'
import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// Source maps for Sentry, so a report's stack points at the app's own code: only when
// SENTRY_AUTH_TOKEN (with SENTRY_ORG and SENTRY_PROJECT) is set for the build. They're uploaded under
// SENTRY_RELEASE (e.g. the commit SHA) and deleted from dist after, so they're never served.
const uploadsSourceMaps = Boolean(process.env.SENTRY_AUTH_TOKEN)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy(),
    // Last, so it sees the final files.
    uploadsSourceMaps && sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      release: { name: process.env.SENTRY_RELEASE },
      sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
      telemetry: false,
    }),
  ],
  // "hidden": maps are made for the upload, without the comment that tells browsers where they are.
  build: { sourcemap: uploadsSourceMaps ? 'hidden' : false },
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

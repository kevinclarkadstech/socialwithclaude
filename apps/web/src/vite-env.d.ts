/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_APP_ENV: 'local' | 'development' | 'staging' | 'production'
    readonly VITE_API_URL: string
    // add other VITE_ vars here as you introduce them
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
import { defineConfig } from "nitro";

export default defineConfig({
    serverDir: "./src/server",
    // plugins: ["src/server/plugins/env.ts"],
    runtimeConfig: {
        databaseUrl: ""
    }
});
import { defineConfig } from "nitro";

export default defineConfig({
    serverDir: "./src/server",
    serverEntry: "./src/server/index.ts",
    // plugins: ["src/server/plugins/env.ts"],
    runtimeConfig: {
        databaseUrl: ""
    }
});
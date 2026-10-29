import { defineConfig } from "nitro";

export default defineConfig({
    serverDir: "./src/transport",
    serverEntry: "./src/index.ts",
    runtimeConfig: {
        databaseUrl: ""
    },
});

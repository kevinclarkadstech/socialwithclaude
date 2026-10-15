import { defineConfig } from "nitro";

export default defineConfig({
    serverDir: "./src",
    serverEntry: "./src/index.ts",
    runtimeConfig: {
        databaseUrl: ""
    },
});

import { defineConfig } from "nitro";

export default defineConfig({
    serverDir: "./src/server",
    serverEntry: "./src/server/index.ts",
    // plugins: ["src/server/plugins/env.ts"],
    runtimeConfig: {
        databaseUrl: ""
    },
    // handlers: [
    //     {
    //         route: "/api/**",
    //         handler: "./src/server/observability/middleware.ts",
    //         middleware: true,
    //     },
    // ],
});
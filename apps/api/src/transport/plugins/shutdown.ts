import { definePlugin } from "nitro";
import { closeDb } from "../../data-access/db";
import { closeRedis } from "../../redis";
import { rootLogger } from "../../observability";

/** On SIGTERM/SIGINT, once the server stops taking requests: close the database pool and Redis. */
export default definePlugin((nitroApp) => {
    nitroApp.hooks.hook("close", async () => {
        const results = await Promise.allSettled([closeDb(), closeRedis()]);
        for (const result of results) {
            if (result.status === "rejected") {
                rootLogger.error("Couldn't close a connection on shutdown", { err: result.reason });
            }
        }
        rootLogger.info("Connections closed");
    });
});

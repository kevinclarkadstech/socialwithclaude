import { definePlugin } from "nitro";
import { serverConfig } from "../../config";
import { deliverPushes, pushSender } from "../../notifications";
import { errorReporter, rootLogger } from "../../observability";

/**
 * Sends pushes every PUSH_DELIVERY_INTERVAL_SECONDS while the server runs
 * (when PUSH_PROVIDER isn't "none" and the interval isn't 0). A round that
 * runs long is never overlapped by the next, and several instances can run
 * it at once: each notification and chat is taken by one of them. On a host
 * without a long-running process (e.g. Workers), turn it off and run
 * `bun run push:deliver` from a scheduler instead.
 */
export default definePlugin((nitroApp) => {
    const intervalSeconds = serverConfig.PUSH_DELIVERY_INTERVAL_SECONDS;
    if (!pushSender || intervalSeconds === 0) {
        return;
    }
    const sender = pushSender;
    let running = false;
    let failingSince: number | null = null;
    const timer = setInterval(() => {
        if (running) {
            return;
        }
        running = true;
        deliverPushes({ sender, logger: rootLogger, chatDelaySeconds: serverConfig.CHAT_PUSH_DELAY_SECONDS })
            .then(() => {
                failingSince = null;
            })
            .catch((error: unknown) => {
                // Reported once per outage, not every round.
                if (failingSince === null) {
                    failingSince = Date.now();
                    rootLogger.error("Push delivery failed", { err: error });
                    errorReporter.report({ error });
                }
            })
            .finally(() => {
                running = false;
            });
    }, intervalSeconds * 1000);
    nitroApp.hooks.hook("close", () => clearInterval(timer));
});

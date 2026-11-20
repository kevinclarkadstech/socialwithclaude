import { definePlugin } from "nitro";
import { platform } from "#platform";
import { serverConfig } from "../../config";
import { deliverPushes, pushSender } from "../../notifications";
import { errorReporter, rootLogger } from "../../observability";

/**
 * Sends pushes every PUSH_DELIVERY_INTERVAL_SECONDS while the server runs
 * (when PUSH_PROVIDER isn't "none" and the interval isn't 0). A round that
 * runs long is never overlapped by the next, and several instances can run
 * it at once: each notification and chat is taken by one of them. Off where
 * nothing runs between requests (Workers): there, a scheduler runs
 * delivery instead (`bun run push:deliver` does one round).
 */
export default definePlugin((nitroApp) => {
    const intervalSeconds = serverConfig.PUSH_DELIVERY_INTERVAL_SECONDS;
    if (!pushSender || intervalSeconds === 0 || !platform.runsBetweenRequests) {
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

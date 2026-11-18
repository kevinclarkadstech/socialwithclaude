/**
 * `bun run push:deliver`: one round of push delivery (see deliverPushes),
 * for hosts that run it from a scheduler (every minute, or as often as the
 * scheduler allows) rather than the API's own loop
 * (PUSH_DELIVERY_INTERVAL_SECONDS=0). Exits 1 if the round failed.
 */
import { closeDb } from "../../data-access/db";
import { serverConfig } from "../../config";
import { deliverPushes, pushSender } from "../../notifications";
import { errorReporter, rootLogger, type ErrorReportContext } from "../../observability";

const context: ErrorReportContext = { command: "push:deliver" };

try {
    if (!pushSender) {
        rootLogger.info("Push delivery skipped: PUSH_PROVIDER is none");
    } else {
        // Logged as structured fields, like the API's own rounds, so a scheduler's logs can be searched the same way.
        const summary = await deliverPushes({ sender: pushSender, logger: rootLogger, chatDelaySeconds: serverConfig.CHAT_PUSH_DELAY_SECONDS });
        rootLogger.info("Push delivery round finished", { ...summary });
    }
} catch (error) {
    rootLogger.error("Push delivery failed", { err: error });
    errorReporter.report({ error, context });
    process.exitCode = 1;
} finally {
    await Promise.all([closeDb(), errorReporter.flush({ timeoutMs: 2000 })]);
}

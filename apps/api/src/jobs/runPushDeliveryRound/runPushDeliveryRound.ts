import { serverConfig } from "../../config";
import { deliverPushes, pushSender } from "../../notifications";
import { errorReporter, rootLogger, type ErrorReportContext } from "../../observability";

/**
 * One round of push delivery (see deliverPushes): what's due is sent, each
 * notification and chat taken by one caller. Run by `bun run push:deliver`
 * and, on Workers, by the Cron Trigger and the push queue. Doesn't throw: a
 * failed round is logged and reported, and the next one tries again.
 * Returns whether it succeeded.
 */
export async function runPushDeliveryRound({ context }: { context: ErrorReportContext }): Promise<boolean> {
    if (!pushSender) {
        return true;
    }
    try {
        const summary = await deliverPushes({ sender: pushSender, logger: rootLogger, chatDelaySeconds: serverConfig.CHAT_PUSH_DELAY_SECONDS });
        // Logged as structured fields, like the API's own rounds, so a scheduler's logs can be searched the same way.
        if (summary.notifications > 0 || summary.chats > 0) {
            rootLogger.info("Push delivery round finished", { ...summary });
        }
        return true;
    } catch (error) {
        rootLogger.error("Push delivery failed", { err: error });
        errorReporter.report({ error, context });
        return false;
    }
}

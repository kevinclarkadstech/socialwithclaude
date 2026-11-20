/**
 * `bun run push:deliver`: one round of push delivery (see
 * runPushDeliveryRound), for hosts that run it from a scheduler (every
 * minute, or as often as the scheduler allows) rather than the API's own
 * loop (PUSH_DELIVERY_INTERVAL_SECONDS=0). Exits 1 if the round failed.
 */
import { closeDb } from "../../data-access/db";
import { runPushDeliveryRound } from "../../jobs";
import { pushSender } from "../../notifications";
import { errorReporter, rootLogger } from "../../observability";

try {
    if (!pushSender) {
        rootLogger.info("Push delivery skipped: PUSH_PROVIDER is none");
    } else if (!(await runPushDeliveryRound({ context: { command: "push:deliver" } }))) {
        process.exitCode = 1;
    }
} finally {
    await Promise.all([closeDb(), errorReporter.flush({ timeoutMs: 2000 })]);
}

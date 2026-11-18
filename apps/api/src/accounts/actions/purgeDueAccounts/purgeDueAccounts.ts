import { accountDeletionGraceDays } from "@myapp/shared/domains";
import type { AppLogger } from "@myapp/shared/observability";
import { getAccountsDueForPurge } from "../../../data-access";
import type { Storage } from "../../../storage";
import { purgeAccount } from "../purgeAccount/purgeAccount";

/** How many accounts one run purges at most; the next run carries on. */
const batchSize = 100;

/**
 * Purges every account scheduled for deletion more than
 * accountDeletionGraceDays ago (see purgeAccount), up to batchSize.
 * How many were purged, and how many had a clean-up step fail.
 */
export async function purgeDueAccounts({ storage, logger, now = new Date() }: {
    storage: Pick<Storage, "deleteMedia">;
    logger: AppLogger;
    now?: Date;
}): Promise<{ purged: number; withFailures: number }> {
    const scheduledBefore = new Date(now.getTime() - accountDeletionGraceDays * 24 * 60 * 60 * 1000);
    const userIds = await getAccountsDueForPurge({ scheduledBefore, limit: batchSize });
    let purged = 0;
    let withFailures = 0;
    for (const userId of userIds) {
        const outcome = await purgeAccount({ userId, storage, logger });
        if (outcome.purged) {
            purged += 1;
        }
        if (outcome.failedMediaKeys.length > 0 || outcome.appleRevokeFailed) {
            withFailures += 1;
        }
    }
    return { purged, withFailures };
}

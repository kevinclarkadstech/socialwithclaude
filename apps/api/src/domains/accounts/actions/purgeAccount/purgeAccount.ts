import type { AppLogger } from "@myapp/shared/observability";
import { addBannedEmail, deleteAccount, getAccountForPurge } from "../../../../data-access";
import type { Storage } from "../../../../infra/storage";
import { accountMediaKeys } from "../../utils/accountMediaKeys/accountMediaKeys";
import { bannedEmailHash } from "../../utils/bannedEmailHash/bannedEmailHash";
import { revokeAppleTokens } from "../revokeAppleTokens/revokeAppleTokens";

/** How a purge went: whether there was an account, and whether each clean-up step worked. */
export interface PurgeOutcome {
    purged: boolean;
    // Files that couldn't be deleted (post photos are swept up later by media:sweep; profile photos aren't).
    failedMediaKeys: string[];
    appleRevokeFailed: boolean;
}

/**
 * Deletes an account and everything it made, for good (see deleteAccount),
 * then its photo files. A banned person's email hash is kept first, so they
 * can't sign up again, and their Sign in with Apple tokens are revoked.
 * Failures after the account is gone are logged as errors and returned.
 */
export async function purgeAccount({ userId, storage, logger }: {
    userId: string;
    storage: Pick<Storage, "deleteMedia">;
    logger: AppLogger;
}): Promise<PurgeOutcome> {
    const account = await getAccountForPurge({ userId });
    if (!account) {
        return { purged: false, failedMediaKeys: [], appleRevokeFailed: false };
    }
    if (account.isBanned) {
        await addBannedEmail({ emailHash: bannedEmailHash(account.email) });
    }
    let appleRevokeFailed = false;
    try {
        await revokeAppleTokens({ tokens: account.appleTokens });
    } catch (err) {
        // Not a reason to keep the account: they asked for it to go.
        appleRevokeFailed = true;
        logger.error("Couldn't revoke Sign in with Apple tokens for a deleted account", { err, userId });
    }

    const mediaKeys = accountMediaKeys(account);
    const purged = await deleteAccount({ userId });
    let failedMediaKeys: string[] = [];
    if (purged && mediaKeys.length > 0) {
        try {
            await storage.deleteMedia({ keys: mediaKeys });
        } catch (err) {
            failedMediaKeys = mediaKeys;
            logger.error("Couldn't delete a deleted account's photo files", { err, userId, count: mediaKeys.length });
        }
    }
    logger.info("Account purged", { userId, purged, mediaFiles: mediaKeys.length });
    return { purged, failedMediaKeys, appleRevokeFailed };
}

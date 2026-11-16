import type { AppLogger } from "../../../../observability";

/**
 * Runs a clean-up once a post is saved (deleting uploads, or the files of
 * photos taken off it). A failure doesn't fail the save: it's logged, and
 * what's left behind expires (uploads) or is swept up later (published
 * photos no post uses).
 */
export async function cleanUpAfterSave({ logger, what, postId, run }: {
    logger: AppLogger;
    // What's being deleted, for the log, e.g. "photo uploads".
    what: string;
    postId: string;
    run: () => Promise<void>;
}): Promise<void> {
    try {
        await run();
    } catch (err) {
        logger.warn(`Couldn't delete a saved post's ${what}`, { postId, err });
    }
}

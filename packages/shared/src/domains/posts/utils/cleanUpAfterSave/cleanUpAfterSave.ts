import type { AppLogger } from "../../../../observability";

/**
 * Runs a clean-up once a post is saved or deleted (deleting uploads, or the
 * files of photos that are gone). A failure doesn't fail what was saved:
 * it's logged, and what's left behind expires (uploads) or is swept up later
 * (published photos no post uses).
 *
 * `level` says how much it matters: "warn" when it only costs storage (an
 * upload that expires anyway), "error" when someone believes a photo is gone
 * but its file is still public, so it gets looked at.
 */
export async function cleanUpAfterSave({ logger, level, what, postId, run }: {
    logger: AppLogger;
    level: "warn" | "error";
    // What's being deleted, for the log, e.g. "photo uploads".
    what: string;
    postId: string;
    run: () => Promise<void>;
}): Promise<void> {
    try {
        await run();
    } catch (err) {
        logger[level](`Couldn't delete a post's ${what}`, { postId, err });
    }
}

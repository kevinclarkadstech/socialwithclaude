import type { AppLogger } from "@myapp/shared/observability";
import type { Storage } from "../../../../infra/storage";
import { parsePostPhotoKey } from "../../sweeping/parsePostPhotoKey/parsePostPhotoKey";

/** What a sweep found (and, unless it was a dry run, deleted). */
export interface SweepSummary {
    // Media objects looked at.
    checked: number;
    // Post photo files no live post uses, old enough to go.
    orphaned: string[];
    deleted: boolean;
    // Pages whose delete failed (each logged as an error); a later run tries them again.
    failedPages: number;
}

/**
 * Finds post photo files in the media bucket that no live post uses, and
 * deletes them unless `dryRun`. These are left behind when something fails
 * part-way: a post that never saved after its photos were published, or a
 * delete that failed after a post was edited or deleted. Files newer than
 * `olderThan` are skipped, so a post being saved right now isn't touched.
 * Profile photos are never touched (they overwrite fixed keys).
 */
export async function sweepOrphanedMedia({ storage, logger, getLivePostMediaIds, olderThan, dryRun }: {
    storage: Pick<Storage, "listMedia" | "deleteMedia">;
    logger: AppLogger;
    /** Which photo ids are on a live post, as "postId/photoId". */
    getLivePostMediaIds: (args: { photoIds: string[] }) => Promise<Set<string>>;
    olderThan: Date;
    dryRun: boolean;
}): Promise<SweepSummary> {
    let checked = 0;
    let failedPages = 0;
    const orphaned: string[] = [];
    let cursor: string | null = null;
    do {
        const page = await storage.listMedia({ cursor });
        checked += page.objects.length;
        const candidates = page.objects.flatMap(({ key, lastModified }) => {
            const photo = parsePostPhotoKey(key);
            return photo && lastModified < olderThan ? [{ key, ...photo }] : [];
        });
        const live = await getLivePostMediaIds({ photoIds: [...new Set(candidates.map(({ photoId }) => photoId))] });
        const unused = candidates.filter(({ postId, photoId }) => !live.has(`${postId}/${photoId}`)).map(({ key }) => key);
        if (unused.length > 0 && !dryRun) {
            try {
                await storage.deleteMedia({ keys: unused });
            } catch (err) {
                // Keep going: the rest of the bucket still gets swept, and these are found again next run.
                failedPages += 1;
                logger.error("Couldn't delete some orphaned media", { keys: unused.slice(0, 100), err });
            }
        }
        orphaned.push(...unused);
        cursor = page.nextCursor;
    } while (cursor);

    logger.info(dryRun ? "Orphaned media found (dry run, nothing deleted)" : "Orphaned media deleted", {
        checked,
        orphaned: orphaned.length,
        failedPages,
        keys: orphaned.slice(0, 100),
    });
    return { checked, orphaned, deleted: !dryRun, failedPages };
}

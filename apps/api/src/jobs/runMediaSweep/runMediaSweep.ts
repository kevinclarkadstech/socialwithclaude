import { getLivePostMediaIds } from "../../data-access";
import { sweepOrphanedMedia } from "../../media";
import { errorReporter, reportingFailures, rootLogger, type ErrorReportContext } from "../../observability";
import { storage } from "../../storage";

/**
 * Finds post photo files no live post uses, older than `olderThanHours`, and
 * deletes them unless `dryRun` (see sweepOrphanedMedia). Run by `bun run
 * media:sweep` and, on Workers, by the daily Cron Trigger. Doesn't throw:
 * failures are logged and reported. Returns the summary, or null if the
 * sweep itself failed.
 */
export async function runMediaSweep({ olderThanHours, dryRun, context }: { olderThanHours: number; dryRun: boolean; context: ErrorReportContext }) {
    try {
        const summary = await sweepOrphanedMedia({
            // A failed delete is reported here; the sweep logs it and carries on with the rest.
            storage: { listMedia: storage.listMedia, deleteMedia: reportingFailures({ reporter: errorReporter, context, run: storage.deleteMedia }) },
            logger: rootLogger,
            getLivePostMediaIds,
            olderThan: new Date(Date.now() - olderThanHours * 60 * 60 * 1000),
            dryRun,
        });
        rootLogger.info("Media sweep finished", { checked: summary.checked, orphaned: summary.orphaned.length, deleted: summary.deleted, failedPages: summary.failedPages });
        return summary;
    } catch (error) {
        // The sweep itself failed (e.g. storage or the database is unreachable).
        rootLogger.error("Media sweep failed", { err: error });
        errorReporter.report({ error, context });
        return null;
    }
}

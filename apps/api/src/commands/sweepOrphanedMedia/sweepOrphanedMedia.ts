/**
 * `bun run media:sweep`: finds post photo files in the media bucket that no
 * live post uses (see sweepOrphanedMedia) and, with `--delete`, deletes them.
 * A dry run by default, so it only reports. Not scheduled yet: once the API
 * has a host, a cron job (or a Workers Cron Trigger) runs it with --delete.
 *
 *   bun run media:sweep                        report what would go
 *   bun run media:sweep --delete               delete it
 *   bun run media:sweep --older-than-hours=48  only files older than that (default 24)
 *
 * Exits 1 if anything failed (a page that couldn't be deleted, or the sweep
 * itself), so a scheduler notices. Each failure is also reported to Sentry.
 */
import { parseArgs } from "node:util";
import { closeDb } from "../../data-access/db";
import { getLivePostMediaIds } from "../../data-access";
import { sweepOrphanedMedia } from "../../media";
import { errorReporter, reportingFailures, rootLogger, type ErrorReportContext } from "../../observability";
import { storage } from "../../storage";

const context: ErrorReportContext = { command: "media:sweep" };

const { values } = parseArgs({
    options: {
        delete: { type: "boolean", default: false },
        "older-than-hours": { type: "string", default: "24" },
    },
});
const olderThanHours = Number(values["older-than-hours"]);
if (!Number.isFinite(olderThanHours) || olderThanHours < 1) {
    console.error("--older-than-hours must be at least 1, so posts being saved right now aren't touched.");
    process.exit(1);
}

try {
    const summary = await sweepOrphanedMedia({
        // A failed delete is reported here; the sweep logs it and carries on with the rest.
        storage: { listMedia: storage.listMedia, deleteMedia: reportingFailures({ reporter: errorReporter, context, run: storage.deleteMedia }) },
        logger: rootLogger,
        getLivePostMediaIds,
        olderThan: new Date(Date.now() - olderThanHours * 60 * 60 * 1000),
        dryRun: !values.delete,
    });
    console.log(JSON.stringify(summary, null, 2));
    if (summary.failedPages > 0) {
        console.error(`${summary.failedPages} page(s) of orphaned media couldn't be deleted; the next run tries again.`);
        process.exitCode = 1;
    }
} catch (error) {
    // The sweep itself failed (e.g. storage or the database is unreachable).
    rootLogger.error("Media sweep failed", { err: error });
    errorReporter.report({ error, context });
    process.exitCode = 1;
} finally {
    await Promise.all([closeDb(), errorReporter.flush({ timeoutMs: 2000 })]);
}

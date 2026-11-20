/**
 * `bun run media:sweep`: finds post photo files in the media bucket that no
 * live post uses (see sweepOrphanedMedia) and, with `--delete`, deletes them.
 * A dry run by default, so it only reports. On Workers, a daily Cron Trigger
 * runs the same job (runMediaSweep) with deleting on; on a server, schedule
 * this command daily with --delete.
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
import { runMediaSweep } from "../../jobs";
import { errorReporter } from "../../observability";

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
    const summary = await runMediaSweep({ olderThanHours, dryRun: !values.delete, context: { command: "media:sweep" } });
    if (summary) {
        console.log(JSON.stringify(summary, null, 2));
    }
    if (!summary || summary.failedPages > 0) {
        if (summary) {
            console.error(`${summary.failedPages} page(s) of orphaned media couldn't be deleted; the next run tries again.`);
        }
        process.exitCode = 1;
    }
} finally {
    await Promise.all([closeDb(), errorReporter.flush({ timeoutMs: 2000 })]);
}

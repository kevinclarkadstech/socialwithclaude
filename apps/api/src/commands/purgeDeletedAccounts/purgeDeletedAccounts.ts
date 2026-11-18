/**
 * `bun run accounts:purge`: deletes for good every account scheduled for
 * deletion more than accountDeletionGraceDays ago (see purgeDueAccounts),
 * up to 100 a run. Not scheduled yet: once the API has a host, a daily cron
 * job (or a Workers Cron Trigger) runs it.
 *
 * Exits 1 if a clean-up step failed for any account (photo files or the
 * Apple token revocation; the accounts are gone either way), or the run
 * itself failed, so a scheduler notices. Failures are reported to Sentry.
 */
import { closeDb } from "../../data-access/db";
import { purgeDueAccounts } from "../../accounts";
import { errorReporter, reportingFailures, rootLogger, type ErrorReportContext } from "../../observability";
import { storage } from "../../storage";

const context: ErrorReportContext = { command: "accounts:purge" };

try {
    const summary = await purgeDueAccounts({
        storage: { deleteMedia: reportingFailures({ reporter: errorReporter, context, run: storage.deleteMedia }) },
        logger: rootLogger,
    });
    console.log(JSON.stringify(summary, null, 2));
    if (summary.withFailures > 0) {
        console.error(`${summary.withFailures} account(s) were deleted, but a clean-up step failed (see the logs).`);
        process.exitCode = 1;
    }
} catch (error) {
    // The run itself failed (e.g. the database is unreachable).
    rootLogger.error("Account purge failed", { err: error });
    errorReporter.report({ error, context });
    process.exitCode = 1;
} finally {
    await Promise.all([closeDb(), errorReporter.flush({ timeoutMs: 2000 })]);
}

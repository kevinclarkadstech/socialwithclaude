import { purgeDueAccounts } from "../../accounts";
import { errorReporter, reportingFailures, rootLogger, type ErrorReportContext } from "../../observability";
import { storage } from "../../storage";

/**
 * Deletes for good the accounts whose days to restore are up (see
 * purgeDueAccounts), up to 100 a run. Run by `bun run accounts:purge` and,
 * on Workers, by the daily Cron Trigger. Doesn't throw: failures are logged
 * and reported. Returns the summary, or null if the run itself failed.
 */
export async function runAccountPurge({ context }: { context: ErrorReportContext }) {
    try {
        const summary = await purgeDueAccounts({
            storage: { deleteMedia: reportingFailures({ reporter: errorReporter, context, run: storage.deleteMedia }) },
            logger: rootLogger,
        });
        rootLogger.info("Account purge finished", { ...summary });
        return summary;
    } catch (error) {
        // The run itself failed (e.g. the database is unreachable).
        rootLogger.error("Account purge failed", { err: error });
        errorReporter.report({ error, context });
        return null;
    }
}

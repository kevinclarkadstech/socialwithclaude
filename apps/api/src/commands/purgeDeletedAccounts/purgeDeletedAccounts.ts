/**
 * `bun run accounts:purge`: deletes for good every account scheduled for
 * deletion more than accountDeletionGraceDays ago (see purgeDueAccounts),
 * up to 100 a run. On Workers, a daily Cron Trigger runs the same job
 * (runAccountPurge); on a server, schedule this command daily.
 *
 * Exits 1 if a clean-up step failed for any account (photo files or the
 * Apple token revocation; the accounts are gone either way), or the run
 * itself failed, so a scheduler notices. Failures are reported to Sentry.
 */
import { closeDb } from "../../data-access/db";
import { runAccountPurge } from "../../jobs";
import { errorReporter } from "../../infra/observability";

try {
    const summary = await runAccountPurge({ context: { command: "accounts:purge" } });
    if (summary) {
        console.log(JSON.stringify(summary, null, 2));
    }
    if (!summary || summary.withFailures > 0) {
        if (summary) {
            console.error(`${summary.withFailures} account(s) were deleted, but a clean-up step failed (see the logs).`);
        }
        process.exitCode = 1;
    }
} finally {
    await Promise.all([closeDb(), errorReporter.flush({ timeoutMs: 2000 })]);
}

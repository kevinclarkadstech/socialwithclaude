/**
 * `bun run accounts:delete <email> --confirm`: deletes someone's account for
 * good, straight away (no grace period; see purgeAccount). For deletion
 * requests that can't go through the app, such as from someone banned (who
 * can't sign in). A banned person's email is kept, hashed, so they can't
 * sign up again. Without --confirm it only says whose account it would delete.
 *
 * Exits 1 if there's no account with that email, or a clean-up step failed.
 */
import { parseArgs } from "node:util";
import { closeDb } from "../../data-access/db";
import { getUserIdByEmail } from "../../data-access";
import { purgeAccount } from "../../accounts";
import { rootLogger } from "../../observability";
import { storage } from "../../storage";

const { values, positionals } = parseArgs({
    options: { confirm: { type: "boolean", default: false } },
    allowPositionals: true,
});
const email = positionals[0];
if (!email) {
    console.error("Usage: bun run accounts:delete <email> --confirm");
    process.exit(1);
}

try {
    const userId = await getUserIdByEmail({ email });
    if (!userId) {
        console.error("No account with that email.");
        process.exitCode = 1;
    } else if (!values.confirm) {
        console.log(`Would delete account ${userId} and everything it made. Run again with --confirm to delete it.`);
    } else {
        const outcome = await purgeAccount({ userId, storage, logger: rootLogger });
        console.log(JSON.stringify({ userId, ...outcome }, null, 2));
        if (outcome.failedMediaKeys.length > 0 || outcome.appleRevokeFailed) {
            process.exitCode = 1;
        }
    }
} finally {
    await closeDb();
}

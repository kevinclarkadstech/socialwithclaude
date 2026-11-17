/**
 * `bun run admin:grant <email>` makes someone an admin (they can moderate:
 * reports, bans, feedback); `bun run admin:revoke <email>` takes it away.
 * The only way to change roles: nothing in the app can, so the app can
 * never be used to hand out admin. Takes effect on their next request.
 *
 * Exits 1 if there's no account with that email (they sign in once first).
 */
import { parseArgs } from "node:util";
import { closeDb } from "../../data-access/db";
import { setUserRoleByEmail } from "../../data-access";

const { values, positionals } = parseArgs({
    options: { revoke: { type: "boolean", default: false } },
    allowPositionals: true,
});
const email = positionals[0];
if (!email) {
    console.error("Usage: bun run admin:grant <email>  (or admin:revoke <email>)");
    process.exit(1);
}

const role = values.revoke ? "user" : "admin";
try {
    const userId = await setUserRoleByEmail({ email, role });
    if (!userId) {
        console.error(`No account with that email. They need to sign in once first.`);
        process.exitCode = 1;
    } else {
        console.log(values.revoke ? `No longer an admin: ${userId}` : `Now an admin: ${userId}`);
    }
} finally {
    await closeDb();
}

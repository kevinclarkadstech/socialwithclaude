/** How long a deleted account can still be restored, before `bun run accounts:purge` deletes it for good. */
export const accountDeletionGraceDays = 30;

/**
 * The version of the Terms of Service and Privacy Policy people agree to
 * (they're agreed to together), "major.minor". Raise the minor version for
 * edits that don't need agreeing to again; raise the major version, and
 * everyone signed in is asked to agree again (see needsToAcceptTerms).
 * Keep it in step with the version printed in apps/app/src/legal/.
 */
export const currentTermsVersion = "1.0";

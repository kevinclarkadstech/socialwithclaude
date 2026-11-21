/**
 * The Cron Triggers in apps/api/wrangler.jsonc, and what each runs (see
 * setUpCloudflare). A test checks the two match. Push delivery has none:
 * the push queue runs it when pushes are due (a lost queue message's pushes
 * go with the next round, or not at all once they're an hour old:
 * pushMaxAgeSeconds), and a schedule would keep the database from going idle.
 */
export const cronSchedules = {
    /** Daily at 03:17 UTC: purging deleted accounts and sweeping orphaned photo files. */
    daily: "17 3 * * *",
} as const;

/** A queue message is delivered this long after the push it's for is due, so the push is ready to claim. */
export const pushQueueSlackSeconds = 1;

/**
 * The Cron Triggers in apps/api/wrangler.jsonc, and what each runs (see
 * setUpCloudflare). A test checks the two match.
 */
export const cronSchedules = {
    /**
     * Every 15 minutes: push delivery, in case a queue message was lost (the queue delivers pushes on
     * time). Not more often: a query every minute would keep the database (Neon) from ever going idle.
     */
    pushDelivery: "*/15 * * * *",
    /** Daily at 03:17 UTC: purging deleted accounts and sweeping orphaned photo files. */
    daily: "17 3 * * *",
} as const;

/** A queue message is delivered this long after the push it's for is due, so the push is ready to claim. */
export const pushQueueSlackSeconds = 1;

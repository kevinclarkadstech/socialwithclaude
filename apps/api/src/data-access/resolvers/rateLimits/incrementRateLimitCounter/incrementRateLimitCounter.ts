import { sql } from "drizzle-orm";
import { db, schema } from "../../../db";

/** At most this many expired counters are cleared each time a new one is made. */
const sweepBatchSize = 100;

/**
 * Adds `cost` to the counter for `rule` and `key`, in one statement so
 * concurrent requests on every instance count exactly. The window starts
 * with the first request and lasts `windowSeconds`; a request after it ends
 * starts a new one (like an expiring key in Redis). Returns the count and
 * how many seconds are left in the window. Making a new row also clears a
 * batch of expired ones, so the table stays small without a scheduled job.
 */
export async function incrementRateLimitCounter({ rule, key, windowSeconds, cost }: {
    rule: string;
    key: string;
    windowSeconds: number;
    cost: number;
}): Promise<{ count: number; secondsLeft: number }> {
    const c = schema.rateLimitCounters;
    const result = await db.execute<{ count: number; seconds_left: number; inserted: boolean }>(sql`
        insert into ${c} (rule, key, count, expires_at)
        values (${rule}, ${key}, ${cost}, now() + make_interval(secs => ${windowSeconds}))
        on conflict (rule, key) do update set
            count = case when ${c.expiresAt} <= now() then excluded.count else ${c.count} + excluded.count end,
            expires_at = case when ${c.expiresAt} <= now() then excluded.expires_at else ${c.expiresAt} end
        returning count, ceil(extract(epoch from expires_at - now()))::int as seconds_left, (xmax = 0) as inserted`);
    const [counter] = result.rows;
    if (!counter) {
        throw new Error("Counting a rate limit returned no row");
    }
    if (counter.inserted) {
        await db.execute(sql`
            delete from ${c} where ctid in (
                select ctid from ${c} where ${c.expiresAt} <= now() limit ${sweepBatchSize}
            )`);
    }
    return { count: counter.count, secondsLeft: counter.seconds_left };
}

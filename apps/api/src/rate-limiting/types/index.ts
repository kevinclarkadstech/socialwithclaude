/** At most `limit` requests per `windowSeconds`, counted per key. */
export interface RateLimitRule {
    name: string;
    limit: number;
    windowSeconds: number;
    /**
     * What happens when the counters can't be reached: "allow" (the default),
     * so an outage there doesn't take the API down, or "refuse", for rules
     * guarding something costly, like sending email.
     */
    whenUnavailable?: "allow" | "refuse";
    /** Whether reaching this limit is worth an alert (see createCacheRateLimiter's onLimitReached). */
    alertWhenReached?: boolean;
}

export type RateLimitDecision = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/**
 * Counts requests against rules. The API only uses this interface, so the
 * stores behind it can change. It's built once, in src/index.ts, and put on
 * each request's context:
 *
 * - createRoutedRateLimiter sends each rule to one of two limiters: per-minute
 *   rules (a 10 or 60 second window) to a fast one, the rest to an exact one.
 * - Today the fast one is createCacheRateLimiter (Redis) and the exact one
 *   createDatabaseRateLimiter (Postgres).
 * - On Cloudflare Workers the fast one would be a limiter over the Rate
 *   Limiting binding (env.X.limit({ key, delta }) → { success }), built per
 *   request from c.env, with `cost` as its `delta`. Each per-minute rule
 *   becomes a binding with the same limit and period in the Wrangler config.
 *   It counts approximately, per Cloudflare location, which suits those
 *   rules; the exact one stays Postgres. See the README's hosting plan.
 */
export interface RateLimiter {
    /** Counts a request against `rule` for `key`: `cost` units (default 1), so an expensive call can count for more. */
    consume(args: { rule: RateLimitRule; key: string; cost?: number }): Promise<RateLimitDecision>;
}

/** What createCacheRateLimiter and createDatabaseRateLimiter share (see createCountingRateLimiter). */
export interface CountingRateLimiterOptions {
    /** Rules' limits by name, overriding the rule's own: for the ones set by configuration (the email budget). */
    limits?: Record<string, number>;
    /** Called when a rule marked alertWhenReached refuses, at most once an hour per rule. */
    onLimitReached?: (rule: RateLimitRule) => void;
}

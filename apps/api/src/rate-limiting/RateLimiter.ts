/** At most `limit` requests per `windowSeconds`, counted per key. */
export interface RateLimitRule {
    name: string;
    limit: number;
    windowSeconds: number;
}

export type RateLimitDecision = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/**
 * Counts requests against rules. The API only uses this interface, so the
 * store behind it can change. It's picked once, in src/index.ts, and put on
 * each request's context:
 *
 * - createRedisRateLimiter: counters in the cache (Redis), shared by every instance.
 * - On Cloudflare Workers, a rate limiter over the Workers rate-limit bindings
 *   (env.X.limit({ key }) → { success }) would implement the same interface,
 *   built per request from c.env. Each rule becomes a binding configured in
 *   wrangler with its limit and period. Bindings only allow a period of 10 or
 *   60 seconds and don't say when a key can try again, so longer rules (the
 *   15-minute sign-in ones) would become per-minute limits, and the retry
 *   delay would be the rule's window.
 */
export interface RateLimiter {
    consume(args: { rule: RateLimitRule; key: string }): Promise<RateLimitDecision>;
}

/** The message for a refused request. */
export function tooManyRequestsMessage({ retryAfterSeconds }: { retryAfterSeconds: number }) {
    const minutes = Math.ceil(retryAfterSeconds / 60);
    return retryAfterSeconds < 60
        ? "Too many requests. Try again in a moment."
        : `Too many requests. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

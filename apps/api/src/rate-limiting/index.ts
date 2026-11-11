import { redis } from "../redis";
import { rootLogger } from "../observability";

/** At most `limit` requests per `windowSeconds`, counted per key. */
export interface RateLimitRule {
    name: string;
    limit: number;
    windowSeconds: number;
}

export const rateLimitRules = {
    /** Everything under /api/auth, per IP address. */
    auth: { name: "auth", limit: 60, windowSeconds: 60 },
    /** Sending a sign-in code, per IP address: each one is an email. */
    sendCodeByIp: { name: "send-code-ip", limit: 10, windowSeconds: 15 * 60 },
    /** Sending a sign-in code, per email address, so nobody's inbox can be flooded. */
    sendCodeByEmail: { name: "send-code-email", limit: 5, windowSeconds: 15 * 60 },
    /** Signing in with a code, per IP address. (Each code also allows only 3 tries.) */
    signInWithCode: { name: "sign-in-code", limit: 20, windowSeconds: 15 * 60 },
    /** tRPC queries, per signed-in user (or IP address when signed out). */
    queries: { name: "queries", limit: 600, windowSeconds: 60 },
    /** tRPC mutations, per signed-in user (or IP address when signed out). */
    mutations: { name: "mutations", limit: 60, windowSeconds: 60 },
} satisfies Record<string, RateLimitRule>;

export type RateLimitDecision = { allowed: true } | { allowed: false; retryAfterSeconds: number };

let lastFailureLoggedAt = 0;

/**
 * Counts a request against `rule` for `key` (a fixed window in Redis, shared
 * by every API instance). If Redis can't be reached the request is allowed:
 * a Redis outage shouldn't take the API down with it.
 */
export async function consumeRateLimit({ rule, key }: { rule: RateLimitRule; key: string }): Promise<RateLimitDecision> {
    const redisKey = `rate-limit:${rule.name}:${key}`;
    try {
        const [count, , ttl] = await redis.multi()
            .incr(redisKey)
            .expire(redisKey, rule.windowSeconds, "NX")
            .ttl(redisKey)
            .execTyped();
        if (count <= rule.limit) {
            return { allowed: true };
        }
        return { allowed: false, retryAfterSeconds: Math.max(1, ttl) };
    } catch (err) {
        if (Date.now() - lastFailureLoggedAt > 60_000) {
            lastFailureLoggedAt = Date.now();
            rootLogger.warn("Rate limiting is off: Redis can't be reached", { err });
        }
        return { allowed: true };
    }
}

/** The message for a refused request. */
export function tooManyRequestsMessage({ retryAfterSeconds }: { retryAfterSeconds: number }) {
    const minutes = Math.ceil(retryAfterSeconds / 60);
    return retryAfterSeconds < 60
        ? "Too many requests. Try again in a moment."
        : `Too many requests. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

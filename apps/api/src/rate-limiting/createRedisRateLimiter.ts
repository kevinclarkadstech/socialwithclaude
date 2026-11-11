import type { Cache } from "../cache";
import { rootLogger } from "../observability";
import type { RateLimiter } from "./types";

/**
 * Rate limits counted in Redis (the cache), shared by every API instance: a
 * fixed window per rule and key. If the cache can't be reached the request is
 * allowed: an outage there shouldn't take the API down with it.
 */
export function createRedisRateLimiter({ cache }: { cache: Cache }): RateLimiter {
    let lastFailureLoggedAt = 0;
    return {
        async consume({ rule, key }) {
            const counterKey = `rate-limit:${rule.name}:${key}`;
            try {
                const [count, , ttl] = await cache.multi()
                    .incr(counterKey)
                    .expire(counterKey, rule.windowSeconds, "NX")
                    .ttl(counterKey)
                    .execTyped();
                if (count <= rule.limit) {
                    return { allowed: true };
                }
                return { allowed: false, retryAfterSeconds: Math.max(1, ttl) };
            } catch (err) {
                if (Date.now() - lastFailureLoggedAt > 60_000) {
                    lastFailureLoggedAt = Date.now();
                    rootLogger.warn("Rate limiting is off: the cache can't be reached", { err });
                }
                return { allowed: true };
            }
        },
    };
}

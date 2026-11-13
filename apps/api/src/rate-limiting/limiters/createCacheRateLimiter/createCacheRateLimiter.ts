import type { Cache } from "../../../cache";
import { rootLogger } from "../../../observability";
import type { RateLimiter } from "../../types";

/**
 * Rate limits counted in the cache, so every API instance shares them: a fixed
 * window per rule and key. If the cache can't be reached the request is
 * allowed: an outage there shouldn't take the API down with it.
 */
export function createCacheRateLimiter({ cache }: { cache: Cache }): RateLimiter {
    let lastFailureLoggedAt = 0;
    return {
        async consume({ rule, key }) {
            try {
                const { count, secondsLeft } = await cache.increment({ key: `rate-limit:${rule.name}:${key}`, windowSeconds: rule.windowSeconds });
                if (count <= rule.limit) {
                    return { allowed: true };
                }
                return { allowed: false, retryAfterSeconds: Math.max(1, secondsLeft) };
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

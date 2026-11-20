import type { AppLogger } from "@myapp/shared/observability";
import type { Cache } from "../../../cache";
import type { CountingRateLimiterOptions, RateLimiter } from "../../types";
import { createCountingRateLimiter } from "../createCountingRateLimiter/createCountingRateLimiter";

/**
 * Rate limits counted in the cache (Redis), shared by every instance. Fast,
 * so it takes the per-minute rules, which are checked on every request
 * (see createRoutedRateLimiter).
 */
export function createCacheRateLimiter({ cache, ...options }: CountingRateLimiterOptions & { cache: Cache; logger: AppLogger }): RateLimiter {
    return createCountingRateLimiter({
        ...options,
        storeName: "the cache",
        increment: ({ rule, key, cost }) => cache.increment({ key: `rate-limit:${rule.name}:${key}`, windowSeconds: rule.windowSeconds, by: cost }),
    });
}

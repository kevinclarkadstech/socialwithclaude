import type { AppLogger } from "@myapp/shared/observability";
import { incrementRateLimitCounter } from "../../../../data-access";
import type { CountingRateLimiterOptions, RateLimiter } from "../../types";
import { createCountingRateLimiter } from "../createCountingRateLimiter/createCountingRateLimiter";

/**
 * Rate limits counted in Postgres (rate_limit_counters): exact across every
 * instance, on any host. A query per check, so it takes the rules that
 * aren't checked on every request: the longer windows, including every
 * one guarding email (see createRoutedRateLimiter).
 */
export function createDatabaseRateLimiter(options: CountingRateLimiterOptions & { logger: AppLogger }): RateLimiter {
    return createCountingRateLimiter({
        ...options,
        storeName: "the database",
        increment: ({ rule, key, cost }) => incrementRateLimitCounter({ rule: rule.name, key, windowSeconds: rule.windowSeconds, cost }),
    });
}

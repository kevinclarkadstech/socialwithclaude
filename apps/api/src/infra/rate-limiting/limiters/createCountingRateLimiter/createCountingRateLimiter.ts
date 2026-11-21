import type { AppLogger } from "@myapp/shared/observability";
import type { CountingRateLimiterOptions, RateLimiter, RateLimitRule } from "../../types";

/** An alert about a limit is repeated at most this often, per rule, per instance. */
const alertIntervalMs = 60 * 60 * 1000;

/**
 * A rate limiter over a store that counts (the cache, the database): a
 * fixed window per rule and key, and a request is allowed while the count
 * is within the limit. If the store can't be reached the request is
 * allowed, so an outage there doesn't take the API down with it, except
 * under a rule that says to refuse (whenUnavailable), like sending email.
 * `limits` overrides rules' limits by name, for the ones set by
 * configuration (the email budget). When a rule marked alertWhenReached
 * refuses, it calls `onLimitReached`, at most once an hour per rule.
 */
export function createCountingRateLimiter({ storeName, increment, logger, limits = {}, onLimitReached }: CountingRateLimiterOptions & {
    /** What the store is, for the log line when it can't be reached ("the cache"). */
    storeName: string;
    /** Adds `cost` to the counter for the rule and key; returns the count and the seconds left in its window. */
    increment: (args: { rule: RateLimitRule; key: string; cost: number }) => Promise<{ count: number; secondsLeft: number }>;
    logger: AppLogger;
}): RateLimiter {
    let lastFailureLoggedAt = 0;
    const lastAlertedAt = new Map<string, number>();

    function alert(rule: RateLimitRule) {
        if (!rule.alertWhenReached || !onLimitReached || Date.now() - (lastAlertedAt.get(rule.name) ?? 0) < alertIntervalMs) {
            return;
        }
        lastAlertedAt.set(rule.name, Date.now());
        onLimitReached(rule);
    }

    return {
        async consume({ rule, key, cost = 1 }) {
            try {
                const { count, secondsLeft } = await increment({ rule, key, cost });
                const limit = limits[rule.name] ?? rule.limit;
                if (count <= limit) {
                    return { allowed: true };
                }
                alert({ ...rule, limit });
                return { allowed: false, retryAfterSeconds: Math.max(1, secondsLeft) };
            } catch (err) {
                if (Date.now() - lastFailureLoggedAt > 60_000) {
                    lastFailureLoggedAt = Date.now();
                    logger.warn(`Rate limiting is off: ${storeName} can't be reached`, { err });
                }
                return rule.whenUnavailable === "refuse" ? { allowed: false, retryAfterSeconds: 60 } : { allowed: true };
            }
        },
    };
}

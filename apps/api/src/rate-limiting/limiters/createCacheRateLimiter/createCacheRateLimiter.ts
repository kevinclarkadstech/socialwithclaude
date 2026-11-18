import type { AppLogger } from "@myapp/shared/observability";
import type { Cache } from "../../../cache";
import type { RateLimiter, RateLimitRule } from "../../types";

/** An alert about a limit is repeated at most this often, per rule, per instance. */
const alertIntervalMs = 60 * 60 * 1000;

/**
 * Rate limits counted in the cache, so every API instance shares them: a fixed
 * window per rule and key. If the cache can't be reached the request is
 * allowed, so an outage there doesn't take the API down with it, except
 * under a rule that says to refuse (whenUnavailable), like sending email.
 * `limits` overrides rules' limits by name, for the ones set by configuration
 * (the email budget). When a rule marked alertWhenReached refuses, it calls
 * `onLimitReached`, at most once an hour per rule.
 */
export function createCacheRateLimiter({ cache, logger, limits = {}, onLimitReached }: {
    cache: Cache;
    logger: AppLogger;
    limits?: Record<string, number>;
    onLimitReached?: (rule: RateLimitRule) => void;
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
        async consume({ rule, key }) {
            try {
                const { count, secondsLeft } = await cache.increment({ key: `rate-limit:${rule.name}:${key}`, windowSeconds: rule.windowSeconds });
                const limit = limits[rule.name] ?? rule.limit;
                if (count <= limit) {
                    return { allowed: true };
                }
                alert({ ...rule, limit });
                return { allowed: false, retryAfterSeconds: Math.max(1, secondsLeft) };
            } catch (err) {
                if (Date.now() - lastFailureLoggedAt > 60_000) {
                    lastFailureLoggedAt = Date.now();
                    logger.warn("Rate limiting is off: the cache can't be reached", { err });
                }
                return rule.whenUnavailable === "refuse" ? { allowed: false, retryAfterSeconds: 60 } : { allowed: true };
            }
        },
    };
}

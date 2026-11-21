import type { AppLogger } from "@myapp/shared/observability";
import type { RateLimiter } from "../../../../rate-limiting";
import type { CloudflareEnv, RateLimitBinding } from "../../types";
import { rateLimitBindingName } from "../../utils/rateLimitBindingName/rateLimitBindingName";

/**
 * The per-minute limiter on Workers: each rule is counted by its Rate
 * Limiting binding (rateLimitBindingName), with a call's cost as the
 * binding's delta. Counts are approximate and kept per Cloudflare location,
 * which suits these rules (they only slow down abuse; the email ones are
 * exact, in Postgres). The binding doesn't say when a key can try again, so
 * the retry delay is the rule's window. A missing binding or a failing one
 * is treated like an unreachable store: allowed, unless the rule says to refuse.
 */
export function createBindingRateLimiter({ env, logger }: { env: () => CloudflareEnv; logger: AppLogger }): RateLimiter {
    let lastFailureLoggedAt = 0;

    function logFailure(message: string, err?: unknown) {
        if (Date.now() - lastFailureLoggedAt > 60_000) {
            lastFailureLoggedAt = Date.now();
            logger.warn(message, { err });
        }
    }

    return {
        async consume({ rule, key, cost = 1 }) {
            const name = rateLimitBindingName(rule);
            const binding = env()[name] as RateLimitBinding | undefined;
            const unavailable = rule.whenUnavailable === "refuse" ? { allowed: false as const, retryAfterSeconds: 60 } : { allowed: true as const };
            if (!binding) {
                logFailure(`Rate limiting is off for "${rule.name}": there's no ${name} binding in wrangler.jsonc`);
                return unavailable;
            }
            try {
                const { success } = await binding.limit({ key, delta: cost });
                return success ? { allowed: true } : { allowed: false, retryAfterSeconds: rule.windowSeconds };
            } catch (err) {
                logFailure(`Rate limiting is off for "${rule.name}": its binding failed`, err);
                return unavailable;
            }
        },
    };
}

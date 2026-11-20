import type { RateLimitRule } from "../../types";

/** The windows a per-minute limiter counts (the only ones Cloudflare's Rate Limiting binding has). */
const perMinuteWindows = [10, 60];

/**
 * Whether a rule goes to the per-minute limiter: its window is 10 or 60
 * seconds. Every other rule goes to the exact one (see createRoutedRateLimiter).
 */
export function countsPerMinute(rule: RateLimitRule): boolean {
    return perMinuteWindows.includes(rule.windowSeconds);
}

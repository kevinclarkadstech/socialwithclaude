import type { RateLimiter } from "../../types";
import { countsPerMinute } from "../../utils/countsPerMinute/countsPerMinute";

/**
 * Sends each rule to the limiter that suits it: rules with a 10 or 60 second
 * window (the ones checked on every request: auth, queries, mutations) to
 * `perMinute`, a fast one (the cache today; Cloudflare's Rate Limiting
 * binding on Workers, which only has those windows and counts
 * approximately). Every other rule, including all that guard email, to
 * `exact`, one count across every instance (Postgres).
 */
export function createRoutedRateLimiter({ perMinute, exact }: { perMinute: RateLimiter; exact: RateLimiter }): RateLimiter {
    return {
        consume: (args) => (countsPerMinute(args.rule) ? perMinute : exact).consume(args),
    };
}

import type { RateLimitRule } from "../../../../rate-limiting";

/** The Rate Limiting binding a per-minute rule is counted by: "send-code-ip" → RATE_LIMIT_SEND_CODE_IP. */
export function rateLimitBindingName(rule: Pick<RateLimitRule, "name">): string {
    return `RATE_LIMIT_${rule.name.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;
}

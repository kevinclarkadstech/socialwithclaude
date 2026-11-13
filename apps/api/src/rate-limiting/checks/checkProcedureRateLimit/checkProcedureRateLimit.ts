import { rateLimitRules } from "../../constants";
import type { ProcedureRateLimitCheck, RateLimiter } from "../../types";
import { tooManyRequestsMessage } from "../../utils/tooManyRequestsMessage/tooManyRequestsMessage";

/**
 * Counts a tRPC call against its limit: queries and mutations each have a
 * per-caller rule. The transport turns a refusal into its own error.
 */
export async function checkProcedureRateLimit({ rateLimiter, type, key }: {
    rateLimiter: RateLimiter;
    type: "query" | "mutation" | "subscription";
    key: string;
}): Promise<ProcedureRateLimitCheck> {
    const rule = type === "query" ? rateLimitRules.queries : rateLimitRules.mutations;
    const decision = await rateLimiter.consume({ rule, key });
    if (decision.allowed) {
        return { allowed: true };
    }
    return {
        allowed: false,
        ruleName: rule.name,
        retryAfterSeconds: decision.retryAfterSeconds,
        message: tooManyRequestsMessage({ retryAfterSeconds: decision.retryAfterSeconds }),
    };
}

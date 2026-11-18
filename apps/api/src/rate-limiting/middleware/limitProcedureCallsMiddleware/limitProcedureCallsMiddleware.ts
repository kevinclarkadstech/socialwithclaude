import { TRPCError } from "@trpc/server";
import type { AppLogger } from "@myapp/shared/observability";

import { procedureRateLimitRules, rateLimitRules } from "../../constants";
import type { RateLimitDecision, RateLimiter, RateLimitRule } from "../../types";
import { alertWhenEmailBudgetReached } from "../../utils/alertWhenEmailBudgetReached/alertWhenEmailBudgetReached";
import { tooManyRequestsMessage } from "../../utils/tooManyRequestsMessage/tooManyRequestsMessage";

/**
 * Rate limits for tRPC: queries and mutations each have a per-caller limit,
 * and some procedures have their own on top (procedureRateLimitRules; ones
 * not per caller, like the email budget, are only counted once the rest
 * allow the call). A refused call is a 429 TOO_MANY_REQUESTS with
 * Retry-After. The tRPC folder wraps this in t.middleware.
 */
export async function limitProcedureCallsMiddleware<TResult>({ ctx, type, path, next }: {
    ctx: { rateLimiter: RateLimiter; rateLimitKey: string; logger: AppLogger; resHeaders: Headers };
    type: "query" | "mutation" | "subscription";
    path: string;
    next: () => Promise<TResult>;
}): Promise<TResult> {
    const extra = procedureRateLimitRules[path] ?? [];
    const perCaller: RateLimitRule[] = [
        type === "query" ? rateLimitRules.queries : rateLimitRules.mutations,
        ...extra.filter((entry) => !entry.sharedKey).map((entry) => entry.rule),
    ];
    const checked: { rule: RateLimitRule; decision: RateLimitDecision }[] = await Promise.all(
        perCaller.map(async (rule) => ({ rule, decision: await ctx.rateLimiter.consume({ rule, key: ctx.rateLimitKey }) })),
    );
    // Shared counters (the email budget) count only calls the caller's own limits let through.
    if (!checked.some(({ decision }) => !decision.allowed)) {
        for (const { rule, sharedKey } of extra) {
            if (sharedKey) {
                checked.push({ rule, decision: await ctx.rateLimiter.consume({ rule, key: sharedKey }) });
            }
        }
    }
    alertWhenEmailBudgetReached(checked);
    const refused = checked.filter((check): check is { rule: RateLimitRule; decision: Extract<RateLimitDecision, { allowed: false }> } => !check.decision.allowed);
    if (refused.length > 0) {
        const retryAfterSeconds = Math.max(...refused.map(({ decision }) => decision.retryAfterSeconds));
        ctx.logger.warn("Request rate limited", { path, rules: refused.map(({ rule }) => rule.name), retryAfterSeconds });
        ctx.resHeaders.set("Retry-After", String(retryAfterSeconds));
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: tooManyRequestsMessage({ retryAfterSeconds }) });
    }
    const result = await next();
    return result;
}

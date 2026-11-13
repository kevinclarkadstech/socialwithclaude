import { TRPCError } from "@trpc/server";
import type { AppLogger } from "@myapp/shared/observability";

import { rateLimitRules } from "../../constants";
import type { RateLimiter } from "../../types";
import { tooManyRequestsMessage } from "../../utils/tooManyRequestsMessage/tooManyRequestsMessage";

/**
 * Rate limits for tRPC: queries and mutations each have a per-caller limit.
 * A refused call is a 429 TOO_MANY_REQUESTS with Retry-After. The tRPC folder
 * wraps this in t.middleware.
 */
export async function limitProcedureCallsMiddleware<TResult>({ ctx, type, path, next }: {
    ctx: { rateLimiter: RateLimiter; rateLimitKey: string; logger: AppLogger; resHeaders: Headers };
    type: "query" | "mutation" | "subscription";
    path: string;
    next: () => Promise<TResult>;
}): Promise<TResult> {
    const rule = type === "query" ? rateLimitRules.queries : rateLimitRules.mutations;
    const decision = await ctx.rateLimiter.consume({ rule, key: ctx.rateLimitKey });
    if (!decision.allowed) {
        ctx.logger.warn("Request rate limited", { path, rule: rule.name, retryAfterSeconds: decision.retryAfterSeconds });
        ctx.resHeaders.set("Retry-After", String(decision.retryAfterSeconds));
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: tooManyRequestsMessage(decision) });
    }
    const result = await next();
    return result;
}

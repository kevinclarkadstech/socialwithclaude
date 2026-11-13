import { TRPCError } from "@trpc/server";

import { checkProcedureRateLimit } from "../../../../rate-limiting";
import { t } from "../../init/init";

/** Queries and mutations each have a per-caller limit; a refused call is a 429 TOO_MANY_REQUESTS. */
export const rateLimit = t.middleware(async ({ ctx, type, path, next }) => {
    const check = await checkProcedureRateLimit({ rateLimiter: ctx.rateLimiter, type, key: ctx.rateLimitKey });
    if (!check.allowed) {
        ctx.logger.warn("Request rate limited", { path, rule: check.ruleName, retryAfterSeconds: check.retryAfterSeconds });
        ctx.resHeaders.set("Retry-After", String(check.retryAfterSeconds));
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: check.message });
    }
    return next();
});

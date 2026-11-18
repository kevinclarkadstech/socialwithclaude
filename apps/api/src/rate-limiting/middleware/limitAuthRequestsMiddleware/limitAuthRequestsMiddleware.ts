import type { MiddlewareHandler } from "hono";
import type { AppHonoEnv } from "../../../index";
import { tooManyRequestsMessage } from "../../utils/tooManyRequestsMessage/tooManyRequestsMessage";
import type { RateLimitDecision, RateLimitRule } from "../../types";
import { emailBudgetKey, rateLimitRules } from "../../constants";
import { alertWhenEmailBudgetReached } from "../../utils/alertWhenEmailBudgetReached/alertWhenEmailBudgetReached";
import { sha256Hex } from "../../utils/sha256Hex/sha256Hex";

/**
 * Rate limits for /api/auth: everything per IP address, and tighter limits on
 * sending sign-in codes (per IP and per email address, per 15 minutes and per
 * day, and the API's email budget) and signing in with one.
 * A refused request gets a 429 with Retry-After, in the shape better-auth's
 * client reads ({ message }).
 */
export const limitAuthRequestsMiddleware: MiddlewareHandler<AppHonoEnv> = async (c, next) => {
    const ip = c.get("clientIp");
    const rateLimiter = c.get("rateLimiter");
    const checks: { rule: RateLimitRule; key: string }[] = [{ rule: rateLimitRules.auth, key: ip }];

    if (c.req.method === "POST" && c.req.path === "/api/auth/email-otp/send-verification-otp") {
        checks.push(
            { rule: rateLimitRules.sendCodeByIp, key: ip },
            { rule: rateLimitRules.sendCodeByIpDaily, key: ip },
        );
        // Read from a copy: better-auth reads the request itself.
        const body: unknown = await c.req.raw.clone().json().catch(() => null);
        const email = typeof body === "object" && body !== null && "email" in body && typeof body.email === "string"
            ? body.email.trim().toLowerCase()
            : null;
        if (email) {
            // Hashed, so the store doesn't hold email addresses.
            const emailKey = await sha256Hex(email);
            checks.push(
                { rule: rateLimitRules.sendCodeByEmail, key: emailKey },
                { rule: rateLimitRules.sendCodeByEmailDaily, key: emailKey },
            );
        }
    }
    if (c.req.method === "POST" && c.req.path === "/api/auth/sign-in/email-otp") {
        checks.push({ rule: rateLimitRules.signInWithCode, key: ip });
    }

    const decisions: RateLimitDecision[] = await Promise.all(checks.map((check) => rateLimiter.consume(check)));
    // The email budget counts only codes the other limits let through, so hammering
    // one address or IP gets that refused without using up everyone's budget.
    const sendsCode = c.req.method === "POST" && c.req.path === "/api/auth/email-otp/send-verification-otp";
    if (sendsCode && !decisions.some((decision) => !decision.allowed)) {
        const budget = await rateLimiter.consume({ rule: rateLimitRules.emailBudget, key: emailBudgetKey });
        alertWhenEmailBudgetReached([{ rule: rateLimitRules.emailBudget, decision: budget }]);
        decisions.push(budget);
    }
    const refused = decisions.filter((decision) => !decision.allowed);
    if (refused.length > 0) {
        const retryAfterSeconds = Math.max(...refused.map((decision) => decision.retryAfterSeconds));
        c.get("logger").warn("Auth request rate limited", { path: c.req.path, retryAfterSeconds });
        c.header("Retry-After", String(retryAfterSeconds));
        return c.json({ message: tooManyRequestsMessage({ retryAfterSeconds }) }, 429);
    }
    await next();
};

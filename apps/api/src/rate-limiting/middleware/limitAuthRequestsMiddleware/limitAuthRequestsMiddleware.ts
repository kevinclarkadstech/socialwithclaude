import type { MiddlewareHandler } from "hono";
import type { AppHonoEnv } from "../../../index";
import { tooManyRequestsMessage } from "../../utils/tooManyRequestsMessage/tooManyRequestsMessage";
import type { RateLimitDecision } from "../../types";
import { rateLimitRules } from "../../constants";
import { sha256Hex } from "../../utils/sha256Hex/sha256Hex";

/**
 * Rate limits for /api/auth: everything per IP address, and tighter limits on
 * sending sign-in codes (per IP and per email address) and signing in with one.
 * A refused request gets a 429 with Retry-After, in the shape better-auth's
 * client reads ({ message }).
 */
export const limitAuthRequestsMiddleware: MiddlewareHandler<AppHonoEnv> = async (c, next) => {
    const ip = c.get("clientIp");
    const rateLimiter = c.get("rateLimiter");
    const checks: Promise<RateLimitDecision>[] = [rateLimiter.consume({ rule: rateLimitRules.auth, key: ip })];

    if (c.req.method === "POST" && c.req.path === "/api/auth/email-otp/send-verification-otp") {
        checks.push(rateLimiter.consume({ rule: rateLimitRules.sendCodeByIp, key: ip }));
        // Read from a copy: better-auth reads the request itself.
        const body: unknown = await c.req.raw.clone().json().catch(() => null);
        const email = typeof body === "object" && body !== null && "email" in body && typeof body.email === "string"
            ? body.email.trim().toLowerCase()
            : null;
        if (email) {
            // Hashed, so the store doesn't hold email addresses.
            const emailKey = await sha256Hex(email);
            checks.push(rateLimiter.consume({ rule: rateLimitRules.sendCodeByEmail, key: emailKey }));
        }
    }
    if (c.req.method === "POST" && c.req.path === "/api/auth/sign-in/email-otp") {
        checks.push(rateLimiter.consume({ rule: rateLimitRules.signInWithCode, key: ip }));
    }

    const decisions = await Promise.all(checks);
    const refused = decisions.filter((decision) => !decision.allowed);
    if (refused.length > 0) {
        const retryAfterSeconds = Math.max(...refused.map((decision) => decision.retryAfterSeconds));
        c.get("logger").warn("Auth request rate limited", { path: c.req.path, retryAfterSeconds });
        c.header("Retry-After", String(retryAfterSeconds));
        return c.json({ message: tooManyRequestsMessage({ retryAfterSeconds }) }, 429);
    }
    await next();
};

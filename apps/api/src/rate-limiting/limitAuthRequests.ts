import { createHash } from "node:crypto";
import type { MiddlewareHandler } from "hono";
import type { AppHonoEnv } from "../index";
import { consumeRateLimit, rateLimitRules, tooManyRequestsMessage, type RateLimitDecision } from "./index";

/**
 * Rate limits for /api/auth: everything per IP address, and tighter limits on
 * sending sign-in codes (per IP and per email address) and signing in with one.
 * A refused request gets a 429 with Retry-After, in the shape better-auth's
 * client reads ({ message }).
 */
export const limitAuthRequests: MiddlewareHandler<AppHonoEnv> = async (c, next) => {
    const ip = c.get("clientIp");
    const checks: Promise<RateLimitDecision>[] = [consumeRateLimit({ rule: rateLimitRules.auth, key: ip })];

    if (c.req.method === "POST" && c.req.path === "/api/auth/email-otp/send-verification-otp") {
        checks.push(consumeRateLimit({ rule: rateLimitRules.sendCodeByIp, key: ip }));
        // Read from a copy: better-auth reads the request itself.
        const body: unknown = await c.req.raw.clone().json().catch(() => null);
        const email = typeof body === "object" && body !== null && "email" in body && typeof body.email === "string"
            ? body.email.trim().toLowerCase()
            : null;
        if (email) {
            // Hashed, so Redis doesn't hold email addresses.
            const emailKey = createHash("sha256").update(email).digest("hex");
            checks.push(consumeRateLimit({ rule: rateLimitRules.sendCodeByEmail, key: emailKey }));
        }
    }
    if (c.req.method === "POST" && c.req.path === "/api/auth/sign-in/email-otp") {
        checks.push(consumeRateLimit({ rule: rateLimitRules.signInWithCode, key: ip }));
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

import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import type { AppLogger } from "@myapp/shared/observability";
import type { AppHonoEnv } from "../../../../index";
import type { RateLimiter } from "../../types";
import { limitAuthRequestsMiddleware } from "./limitAuthRequestsMiddleware";

const silentLogger = { info() {}, warn() {}, error() {}, debug() {}, child: () => silentLogger, setBindings() {} } as unknown as AppLogger;

/** The middleware in front of a stand-in for better-auth, with a rate limiter that records what it counted. */
function app({ refuse = [] }: { refuse?: string[] } = {}) {
    const counted: string[] = [];
    const rateLimiter: RateLimiter = {
        async consume({ rule, key }) {
            counted.push(`${rule.name}:${key.length > 20 ? "<hash>" : key}`);
            return refuse.includes(rule.name) ? { allowed: false, retryAfterSeconds: 120 } : { allowed: true };
        },
    };
    const hono = new Hono<AppHonoEnv>()
        .use("*", async (c, next) => {
            c.set("clientIp", "1.2.3.4");
            c.set("rateLimiter", rateLimiter);
            c.set("logger", silentLogger);
            await next();
        })
        .use("/api/auth/*", limitAuthRequestsMiddleware)
        .post("/api/auth/*", (c) => c.json({ ok: true }));
    const sendCode = () => hono.request("/api/auth/email-otp/send-verification-otp", { method: "POST", body: JSON.stringify({ email: "Sam@Example.com", type: "sign-in" }) });
    return { counted, sendCode };
}

describe("limitAuthRequestsMiddleware", () => {
    test("sending a code counts per IP and per email, per 15 minutes and per day, then the email budget", async () => {
        const { counted, sendCode } = app();
        expect((await sendCode()).status).toBe(200);
        expect(counted).toEqual([
            "auth:1.2.3.4",
            "send-code-ip:1.2.3.4",
            "send-code-ip-day:1.2.3.4",
            "send-code-email:<hash>",
            "send-code-email-day:<hash>",
            "email-budget:all",
        ]);
    });

    test("a code refused for its address doesn't use up the email budget", async () => {
        const { counted, sendCode } = app({ refuse: ["send-code-email-day"] });
        const response = await sendCode();
        expect(response.status).toBe(429);
        expect(response.headers.get("Retry-After")).toBe("120");
        expect(counted).not.toContain("email-budget:all");
    });

    test("once the email budget is used up, codes are refused", async () => {
        const { sendCode } = app({ refuse: ["email-budget"] });
        const response = await sendCode();
        expect(response.status).toBe(429);
        expect(await response.json()).toEqual({ message: "Too many requests. Try again in 2 minutes." });
    });
});

import { describe, expect, mock, test } from "bun:test";
import { TRPCError } from "@trpc/server";
import type { AppLogger } from "@myapp/shared/observability";

import type { RateLimiter, RateLimitRule } from "../../types";
import { limitProcedureCallsMiddleware } from "./limitProcedureCallsMiddleware";

function createCtx({ allowed, refuse = [] }: { allowed: boolean; refuse?: string[] }) {
    const rules: RateLimitRule[] = [];
    const keys: string[] = [];
    const rateLimiter: RateLimiter = {
        async consume({ rule, key }) {
            rules.push(rule);
            keys.push(`${rule.name}:${key}`);
            return allowed && !refuse.includes(rule.name) ? { allowed: true } : { allowed: false, retryAfterSeconds: 90 };
        },
    };
    const logger = { warn: mock(() => {}) } as unknown as AppLogger;
    const ctx = { rateLimiter, rateLimitKey: "user:1", logger, resHeaders: new Headers() };
    return { ctx, rules, keys };
}

describe("limitProcedureCallsMiddleware", () => {
    test("counts queries and mutations against their own rules and calls next", async () => {
        const { ctx, rules } = createCtx({ allowed: true });
        const next = async () => "next-result";
        const queryResult = await limitProcedureCallsMiddleware({ ctx, type: "query", path: "posts.list", next });
        const mutationResult = await limitProcedureCallsMiddleware({ ctx, type: "mutation", path: "posts.create", next });
        expect(queryResult).toBe("next-result");
        expect(mutationResult).toBe("next-result");
        expect(rules.map((rule) => rule.name)).toEqual(["queries", "mutations"]);
    });

    test("a refused call throws TOO_MANY_REQUESTS and sets Retry-After", async () => {
        const { ctx } = createCtx({ allowed: false });
        const next = mock(async () => "next-result");
        const call = limitProcedureCallsMiddleware({ ctx, type: "mutation", path: "posts.create", next });
        await expect(call).rejects.toThrow(new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many requests. Try again in 2 minutes." }));
        expect(ctx.resHeaders.get("Retry-After")).toBe("90");
        expect(next).not.toHaveBeenCalled();
    });

    test("sending an account deletion code also counts against its own limits, per caller, and the shared email budget", async () => {
        const { ctx, keys } = createCtx({ allowed: true });
        await limitProcedureCallsMiddleware({ ctx, type: "mutation", path: "auth.sendAccountDeletionCode", next: async () => null });
        expect(keys).toEqual(["mutations:user:1", "account-deletion-code:user:1", "account-deletion-code-day:user:1", "email-budget:all"]);
    });

    test("a call its caller's limits refuse doesn't use up the email budget", async () => {
        const { ctx, keys } = createCtx({ allowed: true, refuse: ["account-deletion-code"] });
        const call = limitProcedureCallsMiddleware({ ctx, type: "mutation", path: "auth.sendAccountDeletionCode", next: async () => null });
        await expect(call).rejects.toThrow(TRPCError);
        expect(keys).not.toContain("email-budget:all");
    });
});

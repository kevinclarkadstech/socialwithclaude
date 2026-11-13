import { describe, expect, mock, test } from "bun:test";
import { TRPCError } from "@trpc/server";
import type { AppLogger } from "@myapp/shared/observability";

import type { RateLimiter, RateLimitRule } from "../../types";
import { limitProcedureCallsMiddleware } from "./limitProcedureCallsMiddleware";

function createCtx({ allowed }: { allowed: boolean }) {
    const rules: RateLimitRule[] = [];
    const rateLimiter: RateLimiter = {
        async consume({ rule }) {
            rules.push(rule);
            return allowed ? { allowed: true } : { allowed: false, retryAfterSeconds: 90 };
        },
    };
    const logger = { warn: mock(() => {}) } as unknown as AppLogger;
    const ctx = { rateLimiter, rateLimitKey: "user:1", logger, resHeaders: new Headers() };
    return { ctx, rules };
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
});

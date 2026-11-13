import { describe, expect, test } from "bun:test";

import type { RateLimiter, RateLimitRule } from "../../types";
import { checkProcedureRateLimit } from "./checkProcedureRateLimit";

function recordingLimiter({ allowed }: { allowed: boolean }) {
    const rules: RateLimitRule[] = [];
    const rateLimiter: RateLimiter = {
        async consume({ rule }) {
            rules.push(rule);
            return allowed ? { allowed: true } : { allowed: false, retryAfterSeconds: 90 };
        },
    };
    return { rateLimiter, rules };
}

describe("checkProcedureRateLimit", () => {
    test("counts queries and mutations against their own rules", async () => {
        const { rateLimiter, rules } = recordingLimiter({ allowed: true });
        const queryCheck = await checkProcedureRateLimit({ rateLimiter, type: "query", key: "user-1" });
        const mutationCheck = await checkProcedureRateLimit({ rateLimiter, type: "mutation", key: "user-1" });
        expect(queryCheck).toEqual({ allowed: true });
        expect(mutationCheck).toEqual({ allowed: true });
        expect(rules.map((rule) => rule.name)).toEqual(["queries", "mutations"]);
    });

    test("a refusal carries the rule, the retry delay and the message", async () => {
        const { rateLimiter } = recordingLimiter({ allowed: false });
        const check = await checkProcedureRateLimit({ rateLimiter, type: "mutation", key: "user-1" });
        expect(check).toEqual({
            allowed: false,
            ruleName: "mutations",
            retryAfterSeconds: 90,
            message: "Too many requests. Try again in 2 minutes.",
        });
    });
});

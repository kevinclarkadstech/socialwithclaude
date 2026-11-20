import { expect, mock, test } from "bun:test";
import type { AppLogger } from "@myapp/shared/observability";
import { createBindingRateLimiter } from "./createBindingRateLimiter";

const logger = { info() {}, warn() {}, error() {}, debug() {} } as unknown as AppLogger;
const queries = { name: "queries", limit: 600, windowSeconds: 60 };

test("asks the rule's binding, with the cost as its delta, and retries after the window", async () => {
    let success = true;
    const limit = mock(async () => ({ success }));
    const limiter = createBindingRateLimiter({ env: () => ({ RATE_LIMIT_QUERIES: { limit } }), logger });

    expect(await limiter.consume({ rule: queries, key: "user-1", cost: 3 })).toEqual({ allowed: true });
    success = false;
    expect(await limiter.consume({ rule: queries, key: "user-1" })).toEqual({ allowed: false, retryAfterSeconds: 60 });
    expect(limit.mock.calls).toEqual([[{ key: "user-1", delta: 3 }], [{ key: "user-1", delta: 1 }]] as never);
});

test("without its binding, or when it fails, allows unless the rule says to refuse", async () => {
    const failing = { limit: async () => { throw new Error("down"); } };
    const limiter = createBindingRateLimiter({ env: () => ({ RATE_LIMIT_QUERIES: failing }), logger });
    expect(await limiter.consume({ rule: queries, key: "a" })).toEqual({ allowed: true });
    expect(await limiter.consume({ rule: { name: "other", limit: 1, windowSeconds: 60, whenUnavailable: "refuse" }, key: "a" })).toEqual({ allowed: false, retryAfterSeconds: 60 });
});

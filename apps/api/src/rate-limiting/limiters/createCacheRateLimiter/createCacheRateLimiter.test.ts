import { describe, expect, test } from "bun:test";
import type { Cache } from "../../../cache";
import { createCacheRateLimiter } from "./createCacheRateLimiter";

const downCache: Cache = {
    increment: async () => {
        throw new Error("connection refused");
    },
    isReachable: async () => false,
    close: async () => {},
};

describe("createCacheRateLimiter", () => {
    test("counts in the cache, and refuses past the limit", async () => {
        let count = 0;
        const cache: Cache = { increment: async () => ({ count: ++count, secondsLeft: 30 }), isReachable: async () => true, close: async () => {} };
        const limiter = createCacheRateLimiter({ cache });
        const rule = { name: "test", limit: 2, windowSeconds: 60 };
        expect(await limiter.consume({ rule, key: "a" })).toEqual({ allowed: true });
        expect(await limiter.consume({ rule, key: "a" })).toEqual({ allowed: true });
        expect(await limiter.consume({ rule, key: "a" })).toEqual({ allowed: false, retryAfterSeconds: 30 });
    });

    test("without the cache, allows by default but refuses under a rule that says so (sending email)", async () => {
        const limiter = createCacheRateLimiter({ cache: downCache });
        expect(await limiter.consume({ rule: { name: "queries", limit: 1, windowSeconds: 60 }, key: "a" })).toEqual({ allowed: true });
        expect(await limiter.consume({ rule: { name: "send-code", limit: 1, windowSeconds: 60, whenUnavailable: "refuse" }, key: "a" })).toEqual({ allowed: false, retryAfterSeconds: 60 });
    });
});

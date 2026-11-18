import { describe, expect, mock, test } from "bun:test";
import type { AppLogger } from "@myapp/shared/observability";
import type { Cache } from "../../../cache";
import type { RateLimitRule } from "../../types";
import { createCacheRateLimiter } from "./createCacheRateLimiter";

const logger = { info() {}, warn() {}, error() {}, debug() {} } as unknown as AppLogger;

/** A cache whose counter goes up by one on every call. */
function countingCache(): Cache {
    let count = 0;
    return { increment: async () => ({ count: ++count, secondsLeft: 30 }), isReachable: async () => true, close: async () => {} };
}

const downCache: Cache = {
    increment: async () => {
        throw new Error("connection refused");
    },
    isReachable: async () => false,
    close: async () => {},
};

describe("createCacheRateLimiter", () => {
    test("counts in the cache, and refuses past the limit", async () => {
        const limiter = createCacheRateLimiter({ cache: countingCache(), logger });
        const rule = { name: "test", limit: 2, windowSeconds: 60 };
        expect(await limiter.consume({ rule, key: "a" })).toEqual({ allowed: true });
        expect(await limiter.consume({ rule, key: "a" })).toEqual({ allowed: true });
        expect(await limiter.consume({ rule, key: "a" })).toEqual({ allowed: false, retryAfterSeconds: 30 });
    });

    test("takes a rule's limit from `limits` when it's set there", async () => {
        const limiter = createCacheRateLimiter({ cache: countingCache(), logger, limits: { budget: 1 } });
        const rule = { name: "budget", limit: 100, windowSeconds: 60 };
        expect(await limiter.consume({ rule, key: "all" })).toEqual({ allowed: true });
        expect((await limiter.consume({ rule, key: "all" })).allowed).toBe(false);
    });

    test("alerts when a rule marked for it is reached, at most once an hour", async () => {
        const onLimitReached = mock((rule: RateLimitRule) => rule);
        const limiter = createCacheRateLimiter({ cache: countingCache(), logger, limits: { budget: 1 }, onLimitReached });
        const rule = { name: "budget", limit: 100, windowSeconds: 60, alertWhenReached: true };
        for (let i = 0; i < 4; i++) {
            await limiter.consume({ rule, key: "all" });
        }
        expect(onLimitReached).toHaveBeenCalledTimes(1);
        expect(onLimitReached.mock.calls[0]![0]).toMatchObject({ name: "budget", limit: 1 });
    });

    test("without the cache, allows by default but refuses under a rule that says so (sending email)", async () => {
        const limiter = createCacheRateLimiter({ cache: downCache, logger });
        expect(await limiter.consume({ rule: { name: "queries", limit: 1, windowSeconds: 60 }, key: "a" })).toEqual({ allowed: true });
        expect(await limiter.consume({ rule: { name: "send-code", limit: 1, windowSeconds: 60, whenUnavailable: "refuse" }, key: "a" })).toEqual({ allowed: false, retryAfterSeconds: 60 });
    });
});

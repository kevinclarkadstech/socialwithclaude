import { describe, expect, mock, test } from "bun:test";
import type { AppLogger } from "@myapp/shared/observability";
import type { RateLimitRule } from "../../types";
import { createCountingRateLimiter } from "./createCountingRateLimiter";

const logger = { info() {}, warn() {}, error() {}, debug() {} } as unknown as AppLogger;

/** A store whose counter goes up by each call's cost. */
function countingStore() {
    let count = 0;
    return { storeName: "the store", logger, increment: async ({ cost }: { cost: number }) => ({ count: (count += cost), secondsLeft: 30 }) };
}

const downStore = {
    storeName: "the store",
    logger,
    increment: async (): Promise<never> => {
        throw new Error("connection refused");
    },
};

describe("createCountingRateLimiter", () => {
    test("counts in the store, and refuses past the limit", async () => {
        const limiter = createCountingRateLimiter(countingStore());
        const rule = { name: "test", limit: 2, windowSeconds: 60 };
        expect(await limiter.consume({ rule, key: "a" })).toEqual({ allowed: true });
        expect(await limiter.consume({ rule, key: "a" })).toEqual({ allowed: true });
        expect(await limiter.consume({ rule, key: "a" })).toEqual({ allowed: false, retryAfterSeconds: 30 });
    });

    test("counts a call's cost", async () => {
        const limiter = createCountingRateLimiter(countingStore());
        const rule = { name: "test", limit: 10, windowSeconds: 60 };
        expect(await limiter.consume({ rule, key: "a", cost: 10 })).toEqual({ allowed: true });
        expect(await limiter.consume({ rule, key: "a" })).toEqual({ allowed: false, retryAfterSeconds: 30 });
    });

    test("takes a rule's limit from `limits` when it's set there", async () => {
        const limiter = createCountingRateLimiter({ ...countingStore(), limits: { budget: 1 } });
        const rule = { name: "budget", limit: 100, windowSeconds: 60 };
        expect(await limiter.consume({ rule, key: "all" })).toEqual({ allowed: true });
        expect((await limiter.consume({ rule, key: "all" })).allowed).toBe(false);
    });

    test("alerts when a rule marked for it is reached, at most once an hour", async () => {
        const onLimitReached = mock((rule: RateLimitRule) => rule);
        const limiter = createCountingRateLimiter({ ...countingStore(), limits: { budget: 1 }, onLimitReached });
        const rule = { name: "budget", limit: 100, windowSeconds: 60, alertWhenReached: true };
        for (let i = 0; i < 4; i++) {
            await limiter.consume({ rule, key: "all" });
        }
        expect(onLimitReached).toHaveBeenCalledTimes(1);
        expect(onLimitReached.mock.calls[0]![0]).toMatchObject({ name: "budget", limit: 1 });
    });

    test("without the store, allows by default but refuses under a rule that says so (sending email)", async () => {
        const limiter = createCountingRateLimiter(downStore);
        expect(await limiter.consume({ rule: { name: "queries", limit: 1, windowSeconds: 60 }, key: "a" })).toEqual({ allowed: true });
        expect(await limiter.consume({ rule: { name: "send-code", limit: 1, windowSeconds: 60, whenUnavailable: "refuse" }, key: "a" })).toEqual({ allowed: false, retryAfterSeconds: 60 });
    });
});

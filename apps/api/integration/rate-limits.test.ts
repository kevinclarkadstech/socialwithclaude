import { describe, expect, it } from "bun:test";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "../src/data-access/db";
import { incrementRateLimitCounter } from "../src/data-access";
import { createDatabaseRateLimiter } from "../src/infra/rate-limiting";

const silentLogger = { info() {}, warn() {}, error() {}, debug() {}, child: () => silentLogger, setBindings() {} };

const c = schema.rateLimitCounters;
/** Ends a counter's window, as if its time had passed. */
const expire = (rule: string, key: string) =>
    db.update(c).set({ expiresAt: sql`now() - interval '1 second'` }).where(and(eq(c.rule, rule), eq(c.key, key)));

describe("rate limits in Postgres", () => {
    it("counts each request's cost in one window, and says how long is left", async () => {
        const first = await incrementRateLimitCounter({ rule: "test-count", key: "a", windowSeconds: 900, cost: 1 });
        const second = await incrementRateLimitCounter({ rule: "test-count", key: "a", windowSeconds: 900, cost: 3 });
        expect(first.count).toBe(1);
        expect(second.count).toBe(4);
        expect(second.secondsLeft).toBeGreaterThan(890);
        expect(second.secondsLeft).toBeLessThanOrEqual(900);
        // Each key has its own count.
        expect((await incrementRateLimitCounter({ rule: "test-count", key: "b", windowSeconds: 900, cost: 1 })).count).toBe(1);
    });

    it("counts concurrent requests exactly", async () => {
        await Promise.all(Array.from({ length: 25 }, () => incrementRateLimitCounter({ rule: "test-concurrent", key: "a", windowSeconds: 60, cost: 1 })));
        const [row] = await db.select().from(c).where(and(eq(c.rule, "test-concurrent"), eq(c.key, "a")));
        expect(row?.count).toBe(25);
    });

    it("starts a new window once the last one has ended", async () => {
        await incrementRateLimitCounter({ rule: "test-window", key: "a", windowSeconds: 60, cost: 5 });
        await expire("test-window", "a");
        const next = await incrementRateLimitCounter({ rule: "test-window", key: "a", windowSeconds: 60, cost: 1 });
        expect(next).toMatchObject({ count: 1 });
        expect(next.secondsLeft).toBeGreaterThan(55);
    });

    it("clears expired counters when it makes new ones", async () => {
        await incrementRateLimitCounter({ rule: "test-sweep", key: "old", windowSeconds: 60, cost: 1 });
        await expire("test-sweep", "old");
        await incrementRateLimitCounter({ rule: "test-sweep", key: "new", windowSeconds: 60, cost: 1 });
        const keys = (await db.select({ key: c.key }).from(c).where(eq(c.rule, "test-sweep"))).map((row) => row.key);
        expect(keys).toEqual(["new"]);
    });

    it("refuses past the limit, with the time left as the retry delay", async () => {
        const limiter = createDatabaseRateLimiter({ logger: silentLogger });
        const rule = { name: "test-limiter", limit: 2, windowSeconds: 15 * 60, whenUnavailable: "refuse" as const };
        expect(await limiter.consume({ rule, key: "ip-1" })).toEqual({ allowed: true });
        expect(await limiter.consume({ rule, key: "ip-1" })).toEqual({ allowed: true });
        const refused = await limiter.consume({ rule, key: "ip-1" });
        expect(refused.allowed).toBe(false);
        expect(!refused.allowed && refused.retryAfterSeconds).toBeGreaterThan(14 * 60);
    });
});

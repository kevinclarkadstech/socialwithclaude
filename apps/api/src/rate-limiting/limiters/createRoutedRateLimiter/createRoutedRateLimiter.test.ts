import { expect, mock, test } from "bun:test";
import type { RateLimiter } from "../../types";
import { createRoutedRateLimiter } from "./createRoutedRateLimiter";

function recordingLimiter() {
    const consume = mock<RateLimiter["consume"]>(async () => ({ allowed: true }));
    return { limiter: { consume }, consume };
}

test("sends per-minute rules to the fast limiter and the rest to the exact one, with the cost", async () => {
    const perMinute = recordingLimiter();
    const exact = recordingLimiter();
    const limiter = createRoutedRateLimiter({ perMinute: perMinute.limiter, exact: exact.limiter });
    const queries = { name: "queries", limit: 600, windowSeconds: 60 };
    const daily = { name: "daily", limit: 10, windowSeconds: 24 * 60 * 60 };

    await limiter.consume({ rule: queries, key: "u1", cost: 5 });
    await limiter.consume({ rule: daily, key: "u1" });

    expect(perMinute.consume.mock.calls).toEqual([[{ rule: queries, key: "u1", cost: 5 }]]);
    expect(exact.consume.mock.calls).toEqual([[{ rule: daily, key: "u1" }]]);
});

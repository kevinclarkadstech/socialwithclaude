import { expect, test } from "bun:test";
import { createMemoryCache } from "./createMemoryCache";

test("counts by key within a window, then starts a new one", async () => {
    let time = 0;
    const cache = createMemoryCache({ now: () => time });
    expect(await cache.increment({ key: "a", windowSeconds: 60 })).toEqual({ count: 1, secondsLeft: 60 });
    time = 20_000;
    expect(await cache.increment({ key: "a", windowSeconds: 60, by: 4 })).toEqual({ count: 5, secondsLeft: 40 });
    expect(await cache.increment({ key: "b", windowSeconds: 60 })).toEqual({ count: 1, secondsLeft: 60 });
    time = 60_000;
    expect(await cache.increment({ key: "a", windowSeconds: 60 })).toEqual({ count: 1, secondsLeft: 60 });
});

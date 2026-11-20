import type { Cache } from "../../types";

/** Expired counters are cleared once this many are held. */
const sweepAt = 10_000;

/**
 * A Cache in this instance's memory, used when REDIS_URL isn't set. Counts
 * aren't shared between instances, so with N instances a per-minute limit
 * can let through up to N times as much: fine for those limits, which only
 * slow down abuse (the ones guarding email are counted in Postgres).
 */
export function createMemoryCache({ now = Date.now }: { now?: () => number } = {}): Cache {
    const counters = new Map<string, { count: number; expiresAt: number }>();

    function sweep() {
        const time = now();
        for (const [key, counter] of counters) {
            if (counter.expiresAt <= time) {
                counters.delete(key);
            }
        }
    }

    return {
        async increment({ key, windowSeconds, by = 1 }) {
            const time = now();
            let counter = counters.get(key);
            if (!counter || counter.expiresAt <= time) {
                if (!counter && counters.size >= sweepAt) {
                    sweep();
                }
                counter = { count: 0, expiresAt: time + windowSeconds * 1000 };
                counters.set(key, counter);
            }
            counter.count += by;
            return { count: counter.count, secondsLeft: Math.ceil((counter.expiresAt - time) / 1000) };
        },
        async isReachable() {
            return true;
        },
        async close() {
            counters.clear();
        },
    };
}

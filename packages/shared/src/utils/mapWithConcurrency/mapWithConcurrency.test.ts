import { describe, expect, it } from "bun:test";
import { mapWithConcurrency, valuesOrThrow } from "./mapWithConcurrency";

const tick = () => new Promise((resolve) => setTimeout(resolve, 1));

describe("mapWithConcurrency", () => {
    it("keeps the items' order and never runs more than `limit` at once", async () => {
        let running = 0;
        let most = 0;
        const results = await mapWithConcurrency({
            items: [5, 1, 4, 2, 3],
            limit: 2,
            run: async (n) => {
                running += 1;
                most = Math.max(most, running);
                for (let i = 0; i < n; i += 1) {
                    await tick();
                }
                running -= 1;
                return n * 10;
            },
        });
        expect(valuesOrThrow(results)).toEqual([50, 10, 40, 20, 30]);
        expect(most).toBe(2);
    });

    it("settles every item: one failing doesn't stop the rest", async () => {
        const ran: number[] = [];
        const results = await mapWithConcurrency({
            items: [1, 2, 3],
            limit: 1,
            run: async (n) => {
                ran.push(n);
                if (n === 2) {
                    throw new Error("boom");
                }
                return n;
            },
        });
        expect(ran).toEqual([1, 2, 3]);
        expect(results.map((result) => result.status)).toEqual(["fulfilled", "rejected", "fulfilled"]);
        expect(() => valuesOrThrow(results)).toThrow("boom");
    });

    it("handles no items", async () => {
        expect(await mapWithConcurrency({ items: [], limit: 3, run: async (n: number) => n })).toEqual([]);
    });
});

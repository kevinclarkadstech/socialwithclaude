import { describe, expect, it } from "bun:test";
import { mapWithConcurrency } from "./mapWithConcurrency";

const tick = () => new Promise((resolve) => setTimeout(resolve, 1));

describe("mapWithConcurrency", () => {
    it("keeps the items' order and never runs more than `limit` at once", async () => {
        let running = 0;
        let most = 0;
        const results = await mapWithConcurrency({
            items: [5, 1, 4, 2, 3],
            limit: 2,
            map: async (n) => {
                running += 1;
                most = Math.max(most, running);
                for (let i = 0; i < n; i += 1) {
                    await tick();
                }
                running -= 1;
                return n * 10;
            },
        });
        expect(results).toEqual([50, 10, 40, 20, 30]);
        expect(most).toBe(2);
    });

    it("handles no items", async () => {
        expect(await mapWithConcurrency({ items: [], limit: 3, map: async (n: number) => n })).toEqual([]);
    });

    it("rejects when a call rejects", async () => {
        const result = mapWithConcurrency({ items: [1, 2], limit: 2, map: async (n) => {
            if (n === 2) {
                throw new Error("boom");
            }
            return n;
        } });
        expect(result).rejects.toThrow("boom");
    });
});

import { describe, expect, it, mock } from "bun:test";
import { reportingFailures } from "./reportingFailures";

const reporter = () => ({ report: mock((_args: { error: unknown }) => {}), flush: async () => {} });

describe("reportingFailures", () => {
    it("passes a result through without reporting", async () => {
        const r = reporter();
        const run = reportingFailures({ reporter: r, context: { procedure: "posts.updatePost" }, run: async (n: number) => n * 2 });
        expect(await run(21)).toBe(42);
        expect(r.report).not.toHaveBeenCalled();
    });

    it("reports a failure, then rethrows it", async () => {
        const r = reporter();
        const error = new Error("storage down");
        const run = reportingFailures({ reporter: r, context: { procedure: "posts.deletePost" }, run: async () => { throw error; } });
        expect(run()).rejects.toBe(error);
        await run().catch(() => {});
        expect(r.report).toHaveBeenCalledWith({ error, context: { procedure: "posts.deletePost" } });
    });
});

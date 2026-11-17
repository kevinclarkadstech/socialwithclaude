import { describe, expect, it } from "bun:test";
import { withoutSnapshot } from "./withoutSnapshot";

describe("withoutSnapshot", () => {
    it("drops the snapshot and keeps the rest", () => {
        expect(withoutSnapshot({ id: "1", reason: "spam", snapshot: { content: "secret" } })).toEqual({ id: "1", reason: "spam" });
    });

    it("drops it even when the type doesn't mention it", () => {
        const fromDatabase = { id: "1", snapshot: { content: "secret" } };
        const typed: { id: string } = fromDatabase;
        expect(withoutSnapshot(typed)).toEqual({ id: "1" });
    });
});

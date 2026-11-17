import { describe, expect, it } from "bun:test";
import { mockCaller } from "../../../../testing/fixtures";
import { canModerate } from "./canModerate";

describe("canModerate", () => {
    it("allows an admin", () => {
        expect(canModerate({ caller: mockCaller({ role: "admin" }) }).ok).toBe(true);
    });
    it("refuses everyone else", () => {
        expect(canModerate({ caller: mockCaller() })).toMatchObject({ ok: false, error: { type: "authorization" } });
        expect(canModerate({ caller: null })).toMatchObject({ ok: false, error: { type: "authentication" } });
    });
});

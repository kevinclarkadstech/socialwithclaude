import { describe, expect, it } from "bun:test";
import { mockCaller } from "../../../../testing/fixtures";
import { canAdminister } from "./canAdminister";

describe("canAdminister", () => {
    it("allows an admin", () => {
        expect(canAdminister({ caller: mockCaller({ role: "admin" }) }).ok).toBe(true);
    });
    it("refuses everyone else", () => {
        expect(canAdminister({ caller: mockCaller() })).toMatchObject({ ok: false, error: { type: "authorization" } });
        expect(canAdminister({ caller: null })).toMatchObject({ ok: false, error: { type: "authentication" } });
    });
});

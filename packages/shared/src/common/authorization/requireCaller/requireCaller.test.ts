import { describe, expect, it } from "bun:test";
import { mockCaller } from "../../../testing/fixtures";
import { requireCaller, requireCallerWithProfile } from "./requireCaller";

describe("requireCaller", () => {
    it("allows a signed-in user mid sign-up", () => {
        expect(requireCaller({ caller: mockCaller({ profile: null }) }).ok).toBe(true);
    });
    it("refuses a signed-out caller", () => {
        expect(requireCaller({ caller: null })).toMatchObject({ ok: false, error: { type: "authentication" } });
    });
});

describe("requireCallerWithProfile", () => {
    it("allows a user who finished sign-up", () => {
        expect(requireCallerWithProfile({ caller: mockCaller() }).ok).toBe(true);
    });
    it("refuses a user mid sign-up", () => {
        expect(requireCallerWithProfile({ caller: mockCaller({ profile: null }) })).toMatchObject({ ok: false, error: { type: "authorization" } });
    });
});

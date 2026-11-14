import { describe, expect, it } from "bun:test";
import { mockCaller } from "../../../../testing/fixtures";
import { canCreateUserProfile } from "./canCreateUserProfile";

describe("canCreateUserProfile", () => {
    it("allows someone signed in without a profile", () => {
        expect(canCreateUserProfile({ caller: mockCaller({ profile: null }) }).ok).toBe(true);
    });
    it("refuses someone who already has a profile, as a conflict", () => {
        expect(canCreateUserProfile({ caller: mockCaller() })).toMatchObject({ ok: false, error: { type: "conflict" } });
    });
    it("needs a signed-in user", () => {
        expect(canCreateUserProfile({ caller: null })).toMatchObject({ ok: false, error: { type: "authentication" } });
    });
});

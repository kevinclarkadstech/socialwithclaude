import { describe, expect, it } from "bun:test";
import { mockCaller, mockProfile, userId2 } from "../../../testing/fixtures";
import { canBlockUser, canFollowUser } from ".";
import { requireCaller, requireCallerWithProfile } from "../requireCaller";

describe.each([
    ["canFollowUser", canFollowUser],
    ["canBlockUser", canBlockUser],
] as const)("%s", (_name, can) => {
    it("allows someone else", () => {
        expect(can(mockCaller(), mockProfile({ userId: userId2 })).ok).toBe(true);
    });
    it("refuses yourself", () => {
        expect(can(mockCaller(), mockProfile())).toMatchObject({ ok: false, error: { type: "validation" } });
    });
    it("needs a signed-in user who finished sign-up", () => {
        expect(can(null, mockProfile({ userId: userId2 }))).toMatchObject({ ok: false, error: { type: "authentication" } });
        expect(can(mockCaller({ profile: null }), mockProfile({ userId: userId2 }))).toMatchObject({ ok: false, error: { type: "authorization" } });
    });
});

describe("requireCaller", () => {
    it("allows a signed-in user mid sign-up", () => {
        expect(requireCaller(mockCaller({ profile: null })).ok).toBe(true);
    });
    it("refuses a signed-out caller", () => {
        expect(requireCaller(null)).toMatchObject({ ok: false, error: { type: "authentication" } });
    });
});

describe("requireCallerWithProfile", () => {
    it("allows a user who finished sign-up", () => {
        expect(requireCallerWithProfile(mockCaller()).ok).toBe(true);
    });
    it("refuses a user mid sign-up", () => {
        expect(requireCallerWithProfile(mockCaller({ profile: null }))).toMatchObject({ ok: false, error: { type: "authorization" } });
    });
});

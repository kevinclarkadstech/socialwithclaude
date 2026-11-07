import { describe, expect, it } from "bun:test";
import { mockCaller, mockProfile, userId2 } from "../../../testing/fixtures";
import { canBlockUser, canFollowUser } from ".";
import { requireCaller, requireCallerWithProfile } from "../requireCaller";

describe.each([
    ["canFollowUser", canFollowUser],
    ["canBlockUser", canBlockUser],
] as const)("%s", (_name, can) => {
    it("allows someone else", () => {
        expect(can({ caller: mockCaller(), target: mockProfile({ userId: userId2 }) }).ok).toBe(true);
    });
    it("refuses yourself", () => {
        expect(can({ caller: mockCaller(), target: mockProfile() })).toMatchObject({ ok: false, error: { type: "validation" } });
    });
    it("needs a signed-in user who finished sign-up", () => {
        expect(can({ caller: null, target: mockProfile({ userId: userId2 }) })).toMatchObject({ ok: false, error: { type: "authentication" } });
        expect(can({ caller: mockCaller({ profile: null }), target: mockProfile({ userId: userId2 }) })).toMatchObject({ ok: false, error: { type: "authorization" } });
    });
});

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

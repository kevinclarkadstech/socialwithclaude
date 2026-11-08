import { describe, expect, it } from "bun:test";
import { mockCaller, mockProfile, userId2 } from "../../../testing/fixtures";
import { canBlockUser, canFollowUser, canViewUserPosts, canViewUserProfile } from ".";
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

describe("canFollowUser and blocks", () => {
    it("refuses when they blocked you (as not-found) or you blocked them", () => {
        expect(canFollowUser({ caller: mockCaller({ blockList: { blocking: [], blockedBy: [userId2] } }), target: mockProfile({ userId: userId2 }) })).toMatchObject({ ok: false, error: { type: "not-found" } });
        expect(canFollowUser({ caller: mockCaller({ blockList: { blocking: [userId2], blockedBy: [] } }), target: mockProfile({ userId: userId2 }) })).toMatchObject({ ok: false, error: { type: "authorization" } });
    });
});

describe("canViewUserProfile", () => {
    const profile = mockProfile({ userId: userId2 });
    it("allows anyone, signed in or not", () => {
        expect(canViewUserProfile({ caller: null, profile }).ok).toBe(true);
        expect(canViewUserProfile({ caller: mockCaller(), profile }).ok).toBe(true);
    });
    it("is not found for someone they blocked", () => {
        expect(canViewUserProfile({ caller: mockCaller({ blockList: { blocking: [], blockedBy: [userId2] } }), profile })).toMatchObject({ ok: false, error: { type: "not-found" } });
    });
});

describe("canViewUserPosts", () => {
    const profile = mockProfile({ userId: userId2 });
    it("allows everyone on a public profile", () => {
        expect(canViewUserPosts({ caller: null, profile, visibility: "public", followStatus: "none" }).ok).toBe(true);
    });
    it("allows only approved followers, and the user, on a followers-only profile", () => {
        expect(canViewUserPosts({ caller: mockCaller(), profile, visibility: "followers", followStatus: "requested" })).toMatchObject({ ok: false, error: { message: "This account is private" } });
        expect(canViewUserPosts({ caller: mockCaller(), profile, visibility: "followers", followStatus: "following" }).ok).toBe(true);
        expect(canViewUserPosts({ caller: mockCaller({ userId: userId2 }), profile, visibility: "followers", followStatus: "none" }).ok).toBe(true);
    });
});

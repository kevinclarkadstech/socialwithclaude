import { describe, expect, it } from "bun:test";
import { mockCaller, mockProfile, userId2 } from "../../../../testing/fixtures";
import { canViewUserPosts } from "./canViewUserPosts";

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

import { describe, expect, it } from "bun:test";
import { mockCaller, mockProfile, userId2 } from "../../../../testing/fixtures";
import { canViewUserProfile } from "./canViewUserProfile";

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

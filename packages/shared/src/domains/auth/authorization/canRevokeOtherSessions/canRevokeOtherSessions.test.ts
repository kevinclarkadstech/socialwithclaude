import { describe, expect, it } from "bun:test";
import { mockCaller } from "../../../../testing/fixtures";
import { canRevokeOtherSessions } from "./canRevokeOtherSessions";

describe("canRevokeOtherSessions", () => {
    it("allows anyone signed in, even before sign-up is finished", () => {
        expect(canRevokeOtherSessions({ caller: mockCaller() }).ok).toBe(true);
        expect(canRevokeOtherSessions({ caller: mockCaller({ profile: null }) }).ok).toBe(true);
    });
    it("needs a signed-in user", () => {
        expect(canRevokeOtherSessions({ caller: null })).toMatchObject({ ok: false, error: { type: "authentication" } });
    });
});

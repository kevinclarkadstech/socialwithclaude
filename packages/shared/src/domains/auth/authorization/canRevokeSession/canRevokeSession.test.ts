import { describe, expect, it } from "bun:test";
import { mockCaller } from "../../../../testing/fixtures";
import { canRevokeSession } from "./canRevokeSession";

describe("canRevokeSession", () => {
    it("allows anyone signed in, even before sign-up is finished", () => {
        expect(canRevokeSession({ caller: mockCaller() }).ok).toBe(true);
        expect(canRevokeSession({ caller: mockCaller({ profile: null }) }).ok).toBe(true);
    });
    it("needs a signed-in user", () => {
        expect(canRevokeSession({ caller: null })).toMatchObject({ ok: false, error: { type: "authentication" } });
    });
});

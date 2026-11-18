import { describe, expect, it } from "bun:test";
import { mockCaller } from "../../../../testing/fixtures";
import { canManageAccount } from "./canManageAccount";

describe("canManageAccount", () => {
    it("allows anyone signed in, even before sign-up is finished or with deletion scheduled", () => {
        expect(canManageAccount({ caller: mockCaller() }).ok).toBe(true);
        expect(canManageAccount({ caller: mockCaller({ profile: null }) }).ok).toBe(true);
        expect(canManageAccount({ caller: mockCaller({ deletionScheduledAt: new Date().toISOString() }) }).ok).toBe(true);
    });
    it("needs a signed-in user", () => {
        expect(canManageAccount({ caller: null })).toMatchObject({ ok: false, error: { type: "authentication" } });
    });
});

import { describe, expect, it, mock } from "bun:test";
import { mockCaller } from "../../../../testing/fixtures";
import { testContext } from "../../../../testing/context";
import { restoreAccountMutation } from "./restoreAccountMutation";

describe("restoreAccountMutation", () => {
    it("restores an account scheduled for deletion, and only one", async () => {
        const restoreAccount = mock(async () => {});
        const scheduled = mockCaller({ deletionScheduledAt: new Date().toISOString() });
        const restored = await restoreAccountMutation({ input: {}, context: testContext, dependencies: { getCallingUser: async () => scheduled, restoreAccount } });
        expect(restored.ok).toBe(true);
        expect(restoreAccount).toHaveBeenCalledWith({ userId: scheduled.userId });

        const notScheduled = await restoreAccountMutation({ input: {}, context: testContext, dependencies: { getCallingUser: async () => mockCaller(), restoreAccount } });
        expect(notScheduled).toMatchObject({ ok: false, error: { type: "conflict" } });
        expect(restoreAccount).toHaveBeenCalledTimes(1);
    });
});

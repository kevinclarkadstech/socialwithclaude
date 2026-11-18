import { describe, expect, it, mock } from "bun:test";
import { mockCaller } from "../../../../testing/fixtures";
import { testContext } from "../../../../testing/context";
import type { CallingUser } from "../../../users/types/calling-user";
import { scheduleAccountDeletionMutation } from "./scheduleAccountDeletionMutation";

function run({ caller = mockCaller(), isValid = true }: { caller?: CallingUser | null; isValid?: boolean } = {}) {
    const verifyAccountDeletionCode = mock(async () => isValid);
    const scheduleAccountDeletion = mock(async () => {});
    const result = scheduleAccountDeletionMutation({
        input: { code: "123456" },
        context: testContext,
        dependencies: { getCallingUser: async () => caller, verifyAccountDeletionCode, scheduleAccountDeletion },
    });
    return { result, verifyAccountDeletionCode, scheduleAccountDeletion };
}

describe("scheduleAccountDeletionMutation", () => {
    it("schedules the deletion with a right code, for 30 days from now", async () => {
        const { result, verifyAccountDeletionCode, scheduleAccountDeletion } = run();
        const outcome = await result;
        expect(outcome.ok).toBe(true);
        expect(verifyAccountDeletionCode).toHaveBeenCalledWith({ userId: mockCaller().userId, code: "123456" });
        expect(scheduleAccountDeletion).toHaveBeenCalledTimes(1);
        const days = outcome.ok ? (new Date(outcome.value.deletesAt).getTime() - Date.now()) / 86_400_000 : 0;
        expect(Math.round(days)).toBe(30);
    });

    it("refuses a wrong or expired code, without scheduling", async () => {
        const { result, scheduleAccountDeletion } = run({ isValid: false });
        expect(await result).toMatchObject({ ok: false, error: { type: "validation" } });
        expect(scheduleAccountDeletion).not.toHaveBeenCalled();
    });

    it("refuses an account already scheduled, and anyone signed out", async () => {
        expect(await run({ caller: mockCaller({ deletionScheduledAt: new Date().toISOString() }) }).result).toMatchObject({ ok: false, error: { type: "conflict" } });
        expect(await run({ caller: null }).result).toMatchObject({ ok: false, error: { type: "authentication" } });
    });
});

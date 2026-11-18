import { describe, expect, it, mock } from "bun:test";
import type { ModerationSubject } from "../../types/reported-item";
import { mockCaller, userId1, userId2 } from "../../../../testing/fixtures";
import { testContext } from "../../../../testing/context";
import { warnUserMutation } from "./warnUserMutation";

const admin = mockCaller({ userId: userId2, role: "admin" });
const person: ModerationSubject = { userId: userId1, username: "user1", isDeleted: false, role: "user", isBanned: false, banExpires: null, history: { warnings: 1, removals: 0, bans: 0 } };

function run({ subject = person, caller = admin }: { subject?: ModerationSubject | null; caller?: ReturnType<typeof mockCaller> } = {}) {
    const warnUser = mock(async () => {});
    const result = warnUserMutation({
        input: { userId: subject?.userId ?? userId1, reason: "harassment", note: "Keep it civil", kind: "postComment", targetId: "01JEEEEEEEEEEEEEEEEEEEEEE1" },
        context: testContext,
        dependencies: { getCallingUser: async () => caller, getModerationSubject: async () => subject, warnUser },
    });
    return { result, warnUser };
}

describe("warnUserMutation", () => {
    it("warns someone, with the reason, note and what it was about", async () => {
        const { result, warnUser } = run();
        expect(await result).toEqual({ ok: true, value: null });
        expect(warnUser).toHaveBeenCalledWith({ userId: userId1, moderatorId: admin.userId, reason: "harassment", note: "Keep it civil", kind: "postComment", targetId: "01JEEEEEEEEEEEEEEEEEEEEEE1" });
    });

    it("refuses warning yourself or another admin", async () => {
        expect(await run({ subject: { ...person, userId: admin.userId } }).result).toMatchObject({ ok: false, error: { type: "validation" } });
        expect(await run({ subject: { ...person, role: "admin" } }).result).toMatchObject({ ok: false, error: { type: "validation" } });
    });

    it("is for admins only, and not found for nobody", async () => {
        expect(await run({ caller: mockCaller() }).result).toMatchObject({ ok: false, error: { type: "authorization" } });
        expect(await run({ subject: null }).result).toMatchObject({ ok: false, error: { type: "not-found" } });
    });
});

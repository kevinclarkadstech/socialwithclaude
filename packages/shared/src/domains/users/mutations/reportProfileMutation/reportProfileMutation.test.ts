import { describe, expect, it, mock } from "bun:test";
import type { ProfileReport } from "../../types/profile-report";
import type { UserProfile } from "../../types/user-profile";
import { mockCaller, mockProfile, userId2 } from "../../../../testing/fixtures";
import { testContext } from "../../../../testing/context";
import { reportProfileMutation } from "./reportProfileMutation";

const reportId = "01JRRRRRRRRRRRRRRRRRRRRRR1";
const target = mockProfile({ userId: userId2, username: "user2" });

function run({ profile = target, caller = mockCaller() }: { profile?: UserProfile | null; caller?: ReturnType<typeof mockCaller> } = {}) {
    const createProfileReport = mock(async (args: { id: string; userId: string; reportedUserId: string; snapshot: UserProfile }): Promise<ProfileReport> => ({
        id: args.id,
        reportedUserId: args.reportedUserId,
        reason: "impersonation",
        details: null,
        status: "open",
        snapshot: args.snapshot,
        createdBy: args.userId,
        updatedBy: args.userId,
        createdAt: target.createdAt,
        updatedAt: target.createdAt,
    }));
    const result = reportProfileMutation({
        input: { id: reportId, reportedUserId: userId2, reason: "impersonation", details: null },
        context: testContext,
        dependencies: { getCallingUser: async () => caller, getUserProfileByUserId: async () => profile, createProfileReport },
    });
    return { result, createProfileReport };
}

describe("reportProfileMutation", () => {
    it("reports someone, keeping their profile as it is now", async () => {
        const { result, createProfileReport } = run();
        expect(await result).toMatchObject({ ok: true, value: { id: reportId, reportedUserId: userId2 } });
        expect(createProfileReport).toHaveBeenCalledWith(expect.objectContaining({ snapshot: target }));
    });

    it("reports someone who has blocked the reporter", async () => {
        const { result } = run({ caller: mockCaller({ blockList: { blocking: [], blockedBy: [userId2] } }) });
        expect((await result).ok).toBe(true);
    });

    it("refuses reporting yourself", async () => {
        const { result, createProfileReport } = run({ profile: mockProfile() });
        expect(await result).toMatchObject({ ok: false, error: { type: "validation" } });
        expect(createProfileReport).not.toHaveBeenCalled();
    });

    it("is not found for someone without a profile", async () => {
        const { result } = run({ profile: null });
        expect(await result).toMatchObject({ ok: false, error: { type: "not-found" } });
    });
});

import { describe, expect, it, mock } from "bun:test";
import type { ReportedItem } from "../../types/reported-item";
import { mockCaller, mockPost, mockProfile, now, userId1, userId2 } from "../../../../testing/fixtures";
import { testContext } from "../../../../testing/context";
import { mediaId, photoOnPost, postPhotoKey } from "../../../../testing/postMedia";
import { resolveReportsMutation } from "./resolveReportsMutation";

const admin = mockCaller({ userId: userId2, role: "admin" });
const { viewer: _viewer, ...snapshot } = mockPost();
const subject = { userId: userId1, username: "user1", role: "user" as const, isBanned: false, banExpires: null, history: { warnings: 0, removals: 0, bans: 0 } };
const fields = { subject, reports: [], firstReportedAt: now, lastReportedAt: now, isOpen: true };
const reportedPost: ReportedItem = { kind: "post", targetId: snapshot.id, snapshot, ...fields };
const reportedProfile: ReportedItem = { kind: "profile", targetId: userId1, snapshot: mockProfile(), ...fields };

function run({ item, outcome, caller = admin }: { item: ReportedItem | null; outcome: "dismissed" | "removed" | "reviewed"; caller?: ReturnType<typeof mockCaller> }) {
    const dependencies = {
        getCallingUser: async () => caller,
        getReportedItem: async () => item,
        getPostMediaByPostId: async () => [photoOnPost(mediaId)],
        deletePost: mock(async () => true),
        deleteMedia: mock(async () => {}),
        deletePostComment: mock(async () => true),
        getPostCommentPhoto: async () => null,
        deleteChatMessage: mock(async () => true),
        resolveReports: mock(async () => 2),
    };
    const result = resolveReportsMutation({
        input: { kind: item?.kind ?? "post", targetId: item?.targetId ?? snapshot.id, outcome },
        context: testContext,
        dependencies,
    });
    return { result, ...dependencies };
}

describe("resolveReportsMutation", () => {
    it("removes a post and its photos' files, then settles its reports as reviewed", async () => {
        const { result, deletePost, deleteMedia, resolveReports } = run({ item: reportedPost, outcome: "removed" });
        expect(await result).toEqual({ ok: true, value: { resolvedCount: 2 } });
        expect(deletePost).toHaveBeenCalledWith({ id: snapshot.id, userId: admin.userId });
        expect(deleteMedia).toHaveBeenCalledWith({ keys: expect.arrayContaining([postPhotoKey(mediaId, 1280)]) });
        expect(resolveReports).toHaveBeenCalledWith(expect.objectContaining({ outcome: "removed", status: "reviewed", action: "remove_content", subjectUserId: userId1, moderatorId: admin.userId }));
    });

    it("dismisses without touching the post", async () => {
        const { result, deletePost, resolveReports } = run({ item: reportedPost, outcome: "dismissed" });
        expect((await result).ok).toBe(true);
        expect(deletePost).not.toHaveBeenCalled();
        expect(resolveReports).toHaveBeenCalledWith(expect.objectContaining({ status: "dismissed", action: "dismiss_reports" }));
    });

    it("refuses removing a profile", async () => {
        const { result, resolveReports } = run({ item: reportedProfile, outcome: "removed" });
        expect(await result).toMatchObject({ ok: false, error: { type: "validation" } });
        expect(resolveReports).not.toHaveBeenCalled();
    });

    it("refuses reports already handled, and things nobody reported", async () => {
        expect(await run({ item: { ...reportedPost, isOpen: false }, outcome: "dismissed" }).result).toMatchObject({ ok: false, error: { type: "conflict" } });
        expect(await run({ item: null, outcome: "dismissed" }).result).toMatchObject({ ok: false, error: { type: "not-found" } });
    });

    it("is for admins only", async () => {
        const { result, resolveReports } = run({ item: reportedPost, outcome: "removed", caller: mockCaller() });
        expect(await result).toMatchObject({ ok: false, error: { type: "authorization" } });
        expect(resolveReports).not.toHaveBeenCalled();
    });
});

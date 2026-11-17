import { describe, expect, it, mock } from "bun:test";
import type { PostCommentView } from "../../types/post-comment";
import type { PostCommentReport } from "../../types/post-comment-report";
import { mockCaller, mockPostComment, userId2 } from "../../../../testing/fixtures";
import { testContext } from "../../../../testing/context";
import { reportPostCommentMutation } from "./reportPostCommentMutation";

const comment = mockPostComment({ createdBy: userId2 });
const reportId = "01JRRRRRRRRRRRRRRRRRRRRRR1";

function run({ found = comment, caller = mockCaller() }: { found?: PostCommentView | null; caller?: ReturnType<typeof mockCaller> } = {}) {
    const createPostCommentReport = mock(async (args: { id: string; userId: string; postCommentId: string; snapshot: PostCommentReport["snapshot"] }): Promise<PostCommentReport> => ({
        id: args.id,
        postCommentId: args.postCommentId,
        reason: "spam",
        details: null,
        status: "open",
        snapshot: args.snapshot,
        createdBy: args.userId,
        updatedBy: args.userId,
        createdAt: comment.createdAt,
        updatedAt: comment.createdAt,
    }));
    const result = reportPostCommentMutation({
        input: { id: reportId, postCommentId: comment.id, reason: "spam", details: null },
        context: testContext,
        dependencies: { getCallingUser: async () => caller, getPostCommentViewById: async () => found, createPostCommentReport },
    });
    return { result, createPostCommentReport };
}

describe("reportPostCommentMutation", () => {
    it("reports a comment, keeping it as it is now, without returning it", async () => {
        const { result, createPostCommentReport } = run();
        const reported = await result;
        expect(reported).toMatchObject({ ok: true, value: { id: reportId, postCommentId: comment.id } });
        expect(reported.ok && "snapshot" in reported.value).toBe(false);
        expect(createPostCommentReport).toHaveBeenCalledWith(expect.objectContaining({ snapshot: expect.objectContaining({ content: comment.content }) }));
    });

    it("reports across a block (being blocked mid-report doesn't fail it)", async () => {
        const { result } = run({ caller: mockCaller({ blockList: { blocking: [], blockedBy: [userId2] } }) });
        expect((await result).ok).toBe(true);
    });

    it("is not found when the comment is gone", async () => {
        const { result, createPostCommentReport } = run({ found: null });
        expect(await result).toMatchObject({ ok: false, error: { type: "not-found" } });
        expect(createPostCommentReport).not.toHaveBeenCalled();
    });
});

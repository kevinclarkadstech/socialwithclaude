import { describe, expect, it, mock } from "bun:test";
import type { PostView } from "../../types/post";
import type { PostCommentReport } from "../../types/post-comment-report";
import { mockCaller, mockPost, mockPostComment, userId2 } from "../../../../testing/fixtures";
import { testContext } from "../../../../testing/context";
import { reportPostCommentMutation } from "./reportPostCommentMutation";

const comment = mockPostComment();
const caller = mockCaller();
const reportId = "01JRRRRRRRRRRRRRRRRRRRRRR1";

function run({ post }: { post: PostView | null }) {
    const createPostCommentReport = mock(async (args: { id: string; userId: string; postCommentId: string }): Promise<PostCommentReport> => ({
        id: args.id,
        postCommentId: args.postCommentId,
        reason: "spam",
        details: null,
        status: "open",
        snapshot: { ...comment, viewer: undefined } as unknown as PostCommentReport["snapshot"],
        createdBy: args.userId,
        updatedBy: null,
        createdAt: comment.createdAt,
        updatedAt: comment.createdAt,
    }));
    const result = reportPostCommentMutation({
        input: { id: reportId, postCommentId: comment.id, reason: "spam", details: null },
        context: testContext,
        dependencies: {
            getCallingUser: async () => caller,
            getPostCommentViewById: async () => comment,
            getPostViewById: async () => post,
            createPostCommentReport,
        },
    });
    return { result, createPostCommentReport };
}

describe("reportPostCommentMutation", () => {
    it("reports a comment on a post the caller can see", async () => {
        const { result, createPostCommentReport } = run({ post: mockPost({ id: comment.postId }) });
        expect(await result).toMatchObject({ ok: true, value: { id: reportId } });
        expect(createPostCommentReport).toHaveBeenCalledWith(expect.objectContaining({ userId: caller.userId, postCommentId: comment.id }));
    });

    it("is not found on a comment under a post the caller can't see, without reporting", async () => {
        const privatePost = mockPost({
            id: comment.postId,
            createdBy: userId2,
            creator: { userId: userId2, username: "user2", firstName: null, lastName: null, updatedAt: "2026-01-01T00:00:00.000Z", profileVisibility: "followers" },
            viewer: { hasSaved: false, followsCreator: false },
        });
        const { result, createPostCommentReport } = run({ post: privatePost });
        expect(await result).toMatchObject({ ok: false, error: { type: "not-found", message: "Comment not found" } });
        expect(createPostCommentReport).not.toHaveBeenCalled();
    });

    it("is not found when the comment's post is gone", async () => {
        const { result } = run({ post: null });
        expect(await result).toMatchObject({ ok: false, error: { type: "not-found" } });
    });
});

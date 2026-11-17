import { describe, expect, it, mock } from "bun:test";
import type { PostCommentView } from "../../types/post-comment";
import type { PostCommentVote } from "../../types/post-comment-vote";
import type { CallingUser } from "../../../users/types/calling-user";
import type { PostView } from "../../types/post";
import { mockCaller, mockPost, mockPostComment, userId2 } from "../../../../testing/fixtures";
import { testContext } from "../../../../testing/context";
import { setPostCommentVoteMutation } from "./setPostCommentVoteMutation";

const comment = mockPostComment();
const caller = mockCaller();

function run({ value, existing = comment, signedIn = caller, post = mockPost({ id: comment.postId }) }: {
    value: 1 | -1 | null;
    existing?: PostCommentView | null;
    signedIn?: CallingUser | null;
    post?: PostView | null;
}) {
    const setPostCommentVote = mock(async ({ value }: { value: 1 | -1 }): Promise<PostCommentVote> => ({
        userId: caller.userId,
        postCommentId: comment.id,
        value,
        createdAt: comment.createdAt,
        updatedAt: comment.createdAt,
    }));
    const deletePostCommentVote = mock(async () => true);
    const result = setPostCommentVoteMutation({
        input: { postCommentId: comment.id, value },
        context: testContext,
        dependencies: {
            getCallingUser: async () => signedIn,
            getPostCommentViewById: async () => existing,
            getPostAccessById: async () => post,
            setPostCommentVote,
            deletePostCommentVote,
        },
    });
    return { result, setPostCommentVote, deletePostCommentVote };
}

describe("setPostCommentVoteMutation", () => {
    it.each([1, -1] as const)("sets a vote of %d", async (value) => {
        const { result, setPostCommentVote, deletePostCommentVote } = run({ value });
        expect(await result).toMatchObject({ ok: true, value: { postCommentId: comment.id, value } });
        expect(setPostCommentVote).toHaveBeenCalledWith({ userId: caller.userId, postCommentId: comment.id, value });
        expect(deletePostCommentVote).not.toHaveBeenCalled();
    });

    it("removes the vote for null", async () => {
        const { result, setPostCommentVote, deletePostCommentVote } = run({ value: null });
        expect(await result).toEqual({ ok: true, value: null });
        expect(deletePostCommentVote).toHaveBeenCalledWith({ userId: caller.userId, postCommentId: comment.id });
        expect(setPostCommentVote).not.toHaveBeenCalled();
    });

    it("fails with not-found for a missing comment", async () => {
        const { result } = run({ value: 1, existing: null });
        expect(await result).toMatchObject({ ok: false, error: { type: "not-found" } });
    });

    it("needs a signed-in user", async () => {
        const { result, deletePostCommentVote } = run({ value: null, signedIn: null });
        expect(await result).toMatchObject({ ok: false, error: { type: "authentication" } });
        expect(deletePostCommentVote).not.toHaveBeenCalled();
    });

    it("is not found on a comment under a post the caller can't see, without voting", async () => {
        const privatePost = mockPost({
            id: comment.postId,
            createdBy: userId2,
            creator: { userId: userId2, username: "user2", firstName: null, lastName: null, updatedAt: "2026-01-01T00:00:00.000Z", profileVisibility: "followers" },
            viewer: { hasSaved: false, followsCreator: false },
        });
        const { result, setPostCommentVote } = run({ value: 1, post: privatePost });
        expect(await result).toMatchObject({ ok: false, error: { type: "not-found", message: "Comment not found" } });
        expect(setPostCommentVote).not.toHaveBeenCalled();
    });

    it("still asks a signed-out caller to sign in", async () => {
        const { result } = run({ value: 1, signedIn: null });
        expect(await result).toMatchObject({ ok: false, error: { type: "authentication" } });
    });
});

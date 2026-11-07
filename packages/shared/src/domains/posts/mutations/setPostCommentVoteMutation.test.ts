import { describe, expect, it, mock } from "bun:test";
import type { PostComment } from "../types/post-comment";
import type { PostCommentVote } from "../types/post-comment-vote";
import type { CallingUser } from "../../users/types/calling-user";
import { mockCaller, mockPostComment } from "../../../testing/fixtures";
import { testContext } from "../../../testing/context";
import { setPostCommentVoteMutation } from "./setPostCommentVoteMutation";

const comment = mockPostComment();
const caller = mockCaller();

function run({ value, existing = comment, signedIn = caller }: {
    value: 1 | -1 | null;
    existing?: PostComment | null;
    signedIn?: CallingUser | null;
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
            getPostCommentById: async () => existing,
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
});

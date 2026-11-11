import z from "zod";
import type { Mutation } from "../../../../types/mutation";
import { fail, succeed } from "../../../../utils/result";
import { notFoundError } from "../../../../error-handling";
import { canVoteOnPostComment } from "../../authorization/canVoteOnPostComment/canVoteOnPostComment";
import { logDisallowedResult } from "../../../../common/authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../../users/types/calling-user";
import type { PostCommentView } from "../../types/post-comment";
import { PostCommentVoteSchema, PostCommentVoteValueSchema, type PostCommentVote, type PostCommentVoteValue } from "../../types/post-comment-vote";

export const SetPostCommentVoteMutationInputSchema = PostCommentVoteSchema.pick({ postCommentId: true }).extend({
    /** Up (1), down (-1), or null to remove the caller's vote. */
    value: PostCommentVoteValueSchema.nullable(),
});

export type SetPostCommentVoteMutationInput = z.infer<typeof SetPostCommentVoteMutationInputSchema>;

/** The caller's vote now: null once removed. */
export const SetPostCommentVoteMutationOutputSchema = PostCommentVoteSchema.nullable();

export type SetPostCommentVoteMutationOutput = z.infer<typeof SetPostCommentVoteMutationOutputSchema>;

/**
 * Makes the caller's vote on a comment `value`: up, down, or none. Setting
 * the vote they already have (or removing one they don't have) changes nothing, so it's safe to retry.
 */
export const setPostCommentVoteMutation: Mutation<{ input: SetPostCommentVoteMutationInput, output: SetPostCommentVoteMutationOutput }, {
    getCallingUser: GetCallingUser;
    getPostCommentViewById: (args: { id: string; viewerId: string | null }) => Promise<PostCommentView | null>;
    setPostCommentVote: (args: { userId: string; postCommentId: string; value: PostCommentVoteValue }) => Promise<PostCommentVote | null>;
    deletePostCommentVote: (args: { userId: string; postCommentId: string }) => Promise<boolean>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const comment = await dependencies.getPostCommentViewById({ id: input.postCommentId, viewerId: caller?.userId ?? null });
    if (!comment) {
        logger.info("Comment to vote on not found", { postCommentId: input.postCommentId });
        return fail(notFoundError("Comment not found"));
    }

    const allowed = canVoteOnPostComment({ caller, comment });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "set-post-comment-vote", callerId: caller?.userId, postCommentId: comment.id },
        });
        return allowed;
    }

    const userId = allowed.value.userId;
    if (input.value === null) {
        await dependencies.deletePostCommentVote({ userId, postCommentId: comment.id });
        return succeed(null);
    }

    const vote = await dependencies.setPostCommentVote({ userId, postCommentId: comment.id, value: input.value });
    if (!vote) {
        logger.info("Comment deleted before it could be voted on", { postCommentId: comment.id });
        return fail(notFoundError("Comment not found"));
    }

    return succeed(vote);
}

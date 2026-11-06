import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { fail, succeed } from "../../../utils/result";
import { notFoundError } from "../../../error-handling";
import { canVoteOnPostComment } from "../../../logic/authorization/posts/canVoteOnPostComment";
import { logDisallowedResult } from "../../../logic/authorization/logDisallowedResult";
import type { GetCallingUser } from "../../users/types/calling-user";
import type { PostComment } from "../types/post-comment";
import { PostCommentVoteSchema, type PostCommentVote, type PostCommentVoteValue } from "../types/post-comment-vote";

export const VoteOnPostCommentMutationInputSchema = PostCommentVoteSchema.pick({ postCommentId: true, value: true });

export type VoteOnPostCommentMutationInput = z.infer<typeof VoteOnPostCommentMutationInputSchema>;

export const VoteOnPostCommentMutationOutputSchema = PostCommentVoteSchema;

export type VoteOnPostCommentMutationOutput = z.infer<typeof VoteOnPostCommentMutationOutputSchema>;

/** Up (1) or down (-1), replacing the caller's earlier vote. */
export const voteOnPostCommentMutation: Mutation<{ input: VoteOnPostCommentMutationInput, output: VoteOnPostCommentMutationOutput }, {
    getCallingUser: GetCallingUser;
    getPostCommentById: (args: { id: string; viewerId: string | null }) => Promise<PostComment | null>;
    setPostCommentVote: (args: { userId: string; postCommentId: string; value: PostCommentVoteValue }) => Promise<PostCommentVote | null>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const comment = await dependencies.getPostCommentById({ id: input.postCommentId, viewerId: caller?.userId ?? null });
    if (!comment) {
        logger.info("Comment to vote on not found", { postCommentId: input.postCommentId });
        return fail(notFoundError("Comment not found"));
    }

    const allowed = canVoteOnPostComment(caller, comment);
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "vote-on-post-comment", callerId: caller?.userId, postCommentId: comment.id },
        });
        return allowed;
    }

    const vote = await dependencies.setPostCommentVote({ ...input, userId: allowed.value.userId });
    if (!vote) {
        logger.info("Comment deleted before it could be voted on", { postCommentId: comment.id });
        return fail(notFoundError("Comment not found"));
    }

    return succeed(vote);
}

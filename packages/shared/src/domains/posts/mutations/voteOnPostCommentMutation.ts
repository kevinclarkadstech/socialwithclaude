import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { succeed } from "../../../utils/result";
import { notFound } from "../../../utils/failures";
import { canVoteOnPostComment } from "../../../logic/authorization/posts/canVoteOnPostComment";
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
    getPostCommentById: (args: { id: string }) => Promise<PostComment | null>;
    setPostCommentVote: (args: { userId: string; postCommentId: string; value: PostCommentVoteValue }) => Promise<PostCommentVote | null>;
}> = async ({ input, dependencies }) => {
    const comment = await dependencies.getPostCommentById({ id: input.postCommentId });
    if (!comment) return notFound("Comment not found");

    const allowed = canVoteOnPostComment(await dependencies.getCallingUser(), comment);
    if (!allowed.ok) return allowed;

    const vote = await dependencies.setPostCommentVote({ ...input, userId: allowed.value.userId });
    if (!vote) return notFound("Comment not found");
    return succeed(vote);
}

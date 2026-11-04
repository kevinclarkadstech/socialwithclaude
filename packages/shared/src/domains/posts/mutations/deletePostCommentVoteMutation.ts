import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { succeed } from "../../../utils/result";
import { requireCallerWithProfile } from "../../../logic/authorization/requireCaller";
import type { GetCallingUser } from "../../users/types/calling-user";
import { PostCommentVoteSchema } from "../types/post-comment-vote";

export const DeletePostCommentVoteMutationInputSchema = PostCommentVoteSchema.pick({ postCommentId: true });

export type DeletePostCommentVoteMutationInput = z.infer<typeof DeletePostCommentVoteMutationInputSchema>;

export const DeletePostCommentVoteMutationOutputSchema = z.undefined();

export type DeletePostCommentVoteMutationOutput = z.infer<typeof DeletePostCommentVoteMutationOutputSchema>;

/** Removes the caller's vote; succeeds if they hadn't voted. */
export const deletePostCommentVoteMutation: Mutation<{ input: DeletePostCommentVoteMutationInput, output: DeletePostCommentVoteMutationOutput }, {
    getCallingUser: GetCallingUser;
    deletePostCommentVote: (args: { userId: string; postCommentId: string }) => Promise<boolean>;
}> = async ({ input, dependencies }) => {
    const allowed = requireCallerWithProfile(await dependencies.getCallingUser());
    if (!allowed.ok) return allowed;

    await dependencies.deletePostCommentVote({ ...input, userId: allowed.value.userId });
    return succeed();
}

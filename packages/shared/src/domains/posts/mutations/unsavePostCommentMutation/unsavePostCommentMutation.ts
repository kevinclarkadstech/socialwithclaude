import z from "zod";
import type { Mutation } from "../../../../types/mutation";
import { succeed } from "../../../../utils/result";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../../users/types/calling-user";
import { PostCommentSchema } from "../../types/post-comment";
import { canUnsavePostComment } from "../../authorization/canUnsavePostComment/canUnsavePostComment";

export const UnsavePostCommentMutationInputSchema = z.object({
    postCommentId: PostCommentSchema.shape.id,
});

export type UnsavePostCommentMutationInput = z.infer<typeof UnsavePostCommentMutationInputSchema>;

export const UnsavePostCommentMutationOutputSchema = z.null();

export type UnsavePostCommentMutationOutput = z.infer<typeof UnsavePostCommentMutationOutputSchema>;

/** Unsaves a comment. Unsaving one that isn't saved succeeds. */
export const unsavePostCommentMutation: Mutation<{ input: UnsavePostCommentMutationInput, output: UnsavePostCommentMutationOutput }, {
    getCallingUser: GetCallingUser;
    unsavePostComment: (args: { userId: string; postCommentId: string }) => Promise<boolean>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = canUnsavePostComment({ caller });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "unsave-post-comment", callerId: caller?.userId, postCommentId: input.postCommentId },
        });
        return allowed;
    }

    await dependencies.unsavePostComment({ userId: allowed.value.userId, postCommentId: input.postCommentId });
    return succeed();
};

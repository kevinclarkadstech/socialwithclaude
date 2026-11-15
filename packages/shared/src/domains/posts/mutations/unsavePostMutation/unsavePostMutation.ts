import z from "zod";
import type { Mutation } from "../../../../types/mutation";
import { succeed } from "../../../../utils/result";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../../users/types/calling-user";
import { PostSchema } from "../../types/post";
import { canUnsavePost } from "../../authorization/canUnsavePost/canUnsavePost";

export const UnsavePostMutationInputSchema = z.object({
    postId: PostSchema.shape.id,
});

export type UnsavePostMutationInput = z.infer<typeof UnsavePostMutationInputSchema>;

export const UnsavePostMutationOutputSchema = z.null();

export type UnsavePostMutationOutput = z.infer<typeof UnsavePostMutationOutputSchema>;

/** Unsaves a post. Unsaving one that isn't saved succeeds. */
export const unsavePostMutation: Mutation<{ input: UnsavePostMutationInput, output: UnsavePostMutationOutput }, {
    getCallingUser: GetCallingUser;
    unsavePost: (args: { userId: string; postId: string }) => Promise<boolean>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = canUnsavePost({ caller });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "unsave-post", callerId: caller?.userId, postId: input.postId },
        });
        return allowed;
    }

    await dependencies.unsavePost({ userId: allowed.value.userId, postId: input.postId });
    return succeed();
};

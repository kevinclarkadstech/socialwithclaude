import z from "zod";
import type { Mutation } from "../../../../types/mutation";
import { fail, succeed } from "../../../../utils/result";
import { notFoundError } from "../../../../error-handling";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../../users/types/calling-user";
import { PostSchema, type PostView } from "../../types/post";
import { canSavePost } from "../../authorization/canSavePost/canSavePost";
import { hideUnviewablePost } from "../../utils/hideUnviewablePost/hideUnviewablePost";

export const SavePostMutationInputSchema = z.object({
    postId: PostSchema.shape.id,
});

export type SavePostMutationInput = z.infer<typeof SavePostMutationInputSchema>;

export const SavePostMutationOutputSchema = z.null();

export type SavePostMutationOutput = z.infer<typeof SavePostMutationOutputSchema>;

/** Saves a post the caller can see. Saving again succeeds. */
export const savePostMutation: Mutation<{ input: SavePostMutationInput, output: SavePostMutationOutput }, {
    getCallingUser: GetCallingUser;
    getPostViewById: (args: { id: string; viewerId: string | null }) => Promise<PostView | null>;
    savePost: (args: { userId: string; postId: string }) => Promise<boolean>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const post = await dependencies.getPostViewById({ id: input.postId, viewerId: caller?.userId ?? null });
    if (!post) {
        logger.info("Post to save not found", { postId: input.postId });
        return fail(notFoundError("Post not found"));
    }

    const allowed = canSavePost({ caller, post });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "save-post", callerId: caller?.userId, postId: post.id },
        });
        return hideUnviewablePost({ error: allowed.error, message: "Post not found" });
    }

    await dependencies.savePost({ userId: allowed.value.userId, postId: post.id });
    return succeed();
};

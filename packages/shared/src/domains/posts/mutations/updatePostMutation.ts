import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { fail, succeed } from "../../../utils/result";
import { notFoundError } from "../../../error-handling";
import { canUpdatePost } from "../../../logic/authorization/posts/canUpdatePost";
import { logDisallowedResult } from "../../../logic/authorization/logDisallowedResult";
import type { GetCallingUser } from "../../users/types/calling-user";
import { PostSchema, type Post } from "../types/post";

export const UpdatePostMutationInputSchema = PostSchema.pick({ id: true, content: true });

export type UpdatePostMutationInput = z.infer<typeof UpdatePostMutationInputSchema>;

export const UpdatePostMutationOutputSchema = PostSchema;

export type UpdatePostMutationOutput = z.infer<typeof UpdatePostMutationOutputSchema>;

/** Changes a post's (or listing's) content. */
export const updatePostMutation: Mutation<{ input: UpdatePostMutationInput, output: UpdatePostMutationOutput }, {
    getCallingUser: GetCallingUser;
    getPostById: (args: { id: string; viewerId: string | null }) => Promise<Post | null>;
    updatePost: (args: { id: string; userId: string; content: string }) => Promise<Post | null>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const post = await dependencies.getPostById({ id: input.id, viewerId: caller?.userId ?? null });
    if (!post) {
        logger.info("Post to update not found", { postId: input.id });
        return fail(notFoundError("Post not found"));
    }

    const allowed = canUpdatePost(caller, post);
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "update-post", callerId: caller?.userId, postId: post.id },
        });
        return allowed;
    }

    const updatedPost = await dependencies.updatePost({ ...input, userId: allowed.value.userId });
    if (!updatedPost) {
        logger.info("Post deleted before it could be updated", { postId: post.id });
        return fail(notFoundError("Post not found"));
    }

    return succeed(updatedPost);
}

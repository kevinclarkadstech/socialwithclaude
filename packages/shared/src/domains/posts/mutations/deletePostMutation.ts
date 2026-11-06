import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { fail, succeed } from "../../../utils/result";
import { notFoundError } from "../../../error-handling";
import { canDeletePost } from "../../../logic/authorization/posts/canDeletePost";
import { logDisallowedResult } from "../../../logic/authorization/logDisallowedResult";
import type { GetCallingUser } from "../../users/types/calling-user";
import { PostSchema, type Post } from "../types/post";

export const DeletePostMutationInputSchema = PostSchema.pick({ id: true });

export type DeletePostMutationInput = z.infer<typeof DeletePostMutationInputSchema>;

export const DeletePostMutationOutputSchema = z.undefined();

export type DeletePostMutationOutput = z.infer<typeof DeletePostMutationOutputSchema>;

/** Deletes a post (or listing). */
export const deletePostMutation: Mutation<{ input: DeletePostMutationInput, output: DeletePostMutationOutput }, {
    getCallingUser: GetCallingUser;
    getPostById: (args: { id: string; viewerId: string | null }) => Promise<Post | null>;
    deletePost: (args: { id: string; userId: string }) => Promise<boolean>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const post = await dependencies.getPostById({ id: input.id, viewerId: caller?.userId ?? null });
    if (!post) {
        logger.info("Post to delete not found", { postId: input.id });
        return fail(notFoundError("Post not found"));
    }

    const allowed = canDeletePost(caller, post);
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "delete-post", callerId: caller?.userId, postId: post.id },
        });
        return allowed;
    }

    await dependencies.deletePost({ id: post.id, userId: allowed.value.userId });
    return succeed();
}

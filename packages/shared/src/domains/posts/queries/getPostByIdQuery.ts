import z from "zod";
import type { Query } from "../../../types/query";
import { fail, succeed } from "../../../utils/result";
import { notFoundError } from "../../../error-handling";
import { canViewPost } from "../utils/canViewPost";
import { logDisallowedResult } from "../../../logic/authorization/logDisallowedResult";
import type { GetCallingUser } from "../../users/types/calling-user";
import { PostSchema, type Post } from "../types/post";

export const GetPostByIdQueryInputSchema = z.object({
    postId: PostSchema.shape.id,
});

export type GetPostByIdQueryInput = z.infer<typeof GetPostByIdQueryInputSchema>;

export const GetPostByIdQueryOutputSchema = z.object({
    post: PostSchema,
});

export type GetPostByIdQueryOutput = z.infer<typeof GetPostByIdQueryOutputSchema>;

/** A post (or listing). Not found if it doesn't exist, was deleted, or the caller can't see it (canViewPost). */
export const getPostByIdQuery: Query<{ input: GetPostByIdQueryInput, output: GetPostByIdQueryOutput }, {
    getCallingUser: GetCallingUser;
    getPostById: (args: { id: string; viewerId: string | null }) => Promise<Post | null>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const post = await dependencies.getPostById({ id: input.postId, viewerId: caller?.userId ?? null });
    if (!post) {
        logger.info("Post not found", { postId: input.postId });
        return fail(notFoundError("Post not found"));
    }

    const viewable = canViewPost({ caller, post });
    if (!viewable.ok) {
        logDisallowedResult({
            logger,
            result: viewable,
            details: { action: "view-post", callerId: caller?.userId, postId: post.id },
        });
        // Not found either way, so a link doesn't reveal that a private or blocked post exists.
        return fail(notFoundError("Post not found"));
    }

    return succeed({ post });
}

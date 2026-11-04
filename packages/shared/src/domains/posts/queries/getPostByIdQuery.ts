import z from "zod";
import type { Query } from "../../../types/query";
import { succeed } from "../../../utils/result";
import { notFound } from "../../../utils/failures";
import { PostSchema, type Post } from "../types/post";

export const GetPostByIdQueryInputSchema = z.object({
    postId: PostSchema.shape.id,
});

export type GetPostByIdQueryInput = z.infer<typeof GetPostByIdQueryInputSchema>;

export const GetPostByIdQueryOutputSchema = z.object({
    post: PostSchema,
});

export type GetPostByIdQueryOutput = z.infer<typeof GetPostByIdQueryOutputSchema>;

/** A post (or listing). Not found if it doesn't exist or was deleted. */
export const getPostByIdQuery: Query<{ input: GetPostByIdQueryInput, output: GetPostByIdQueryOutput }, {
    getPostById: (args: { id: string }) => Promise<Post | null>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const post = await dependencies.getPostById({ id: input.postId });
    if (!post) {
        logger.info("Post not found", { postId: input.postId });
        return notFound("Post not found");
    }

    return succeed({ post });
}

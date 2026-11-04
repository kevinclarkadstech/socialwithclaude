import z from "zod";
import type { Query } from "../../../types/query";
import { succeed, fail } from "../../../utils/result";
import { createAppError } from "../../../error-handling";
import { PostSchema, type Post } from "../types/post";

export const GetPostByIdQueryInputSchema = z.object({
    postId: z.ulid(),
});

export type GetPostByIdQueryInput = z.infer<typeof GetPostByIdQueryInputSchema>;

export const GetPostByIdQueryOutputSchema = z.object({
    post: PostSchema,
});

export type GetPostByIdQueryOutput = z.infer<typeof GetPostByIdQueryOutputSchema>;

export const getPostByIdQuery: Query<{ input: GetPostByIdQueryInput, output: GetPostByIdQueryOutput }, {
    fetchPostById: (postId: string) => Promise<Post | null>
}> = async ({ input, dependencies }) => {
    const post = await dependencies.fetchPostById(input.postId);
    if (!post) return fail(createAppError({ type: "not-found", message: "Post not found" }));
    return succeed({ post });
}

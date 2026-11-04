import z from "zod";
import { Query } from "../../../types/query";
import { succeed, fail } from "../../../types/result";
import { Post } from "../types/post";

export const GetPostByIdQueryInputSchema = z.object({
    postId: z.string(),
});

export type GetPostByIdQueryInput = z.infer<typeof GetPostByIdQueryInputSchema>;

export const GetPostByIdQueryOutputSchema = z.object({
    post: z.custom<Post>((data) => data as Post).nullable(),
});

export type GetPostByIdQueryOutput = z.infer<typeof GetPostByIdQueryOutputSchema>;

export const getPostByIdQuery: Query<{ input: GetPostByIdQueryInput, output: GetPostByIdQueryOutput }, {
    fetchPostById: (postId: string) => Promise<Post | null>
}> = async ({ input, dependencies }) => {
    const post = await dependencies.fetchPostById(input.postId);
    return succeed({ post })
}
import z from "zod";
import type { Query } from "../../../types/query";
import { succeed } from "../../../utils/result";
import { PageInputSchema, type Page } from "../../../common/types/page";
import { PostCommentSchema, type PostComment } from "../types/post-comment";

export const GetPostCommentsQueryInputSchema = PageInputSchema.extend({
    postId: PostCommentSchema.shape.postId,
    order: z.enum(["oldest", "newest"]).default("oldest"),
});

export type GetPostCommentsQueryInput = z.infer<typeof GetPostCommentsQueryInputSchema>;

export const GetPostCommentsQueryOutputSchema = z.object({
    items: z.array(PostCommentSchema),
    nextCursor: z.string().nullable(),
});

export type GetPostCommentsQueryOutput = z.infer<typeof GetPostCommentsQueryOutputSchema>;

/** A post's comments, oldest first unless `order` is "newest". */
export const getPostCommentsQuery: Query<{ input: GetPostCommentsQueryInput, output: GetPostCommentsQueryOutput }, {
    getPostComments: (args: {
        postId: string;
        order: "oldest" | "newest";
        cursor?: string | null;
        limit: number;
    }) => Promise<Page<PostComment>>;
}> = async ({ input, dependencies }) => {
    return succeed(await dependencies.getPostComments(input));
}

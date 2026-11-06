import z from "zod";
import type { Query } from "../../../types/query";
import { succeed } from "../../../utils/result";
import { PageInputSchema, type Page } from "../../../common/types/page";
import { PostCommentSchema, type PostComment } from "../types/post-comment";
import type { GetCallingUser } from "../../users/types/calling-user";

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
    getCallingUser: GetCallingUser;
    getPostComments: (args: {
        postId: string;
        viewerId: string | null;
        order: "oldest" | "newest";
        cursor?: string | null;
        limit: number;
    }) => Promise<Page<PostComment>>;
}> = async ({ input, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const page = await dependencies.getPostComments({ ...input, viewerId: caller?.userId ?? null });
    return succeed(page);
}

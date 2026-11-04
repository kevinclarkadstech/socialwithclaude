import z from "zod";
import type { Query } from "../../../types/query";
import { succeed } from "../../../utils/result";
import { PageInputSchema, type Page, type PageInput } from "../../../common/types/page";
import { PostSchema, type Post } from "../types/post";

export const GetFeedQueryInputSchema = PageInputSchema;

export type GetFeedQueryInput = z.infer<typeof GetFeedQueryInputSchema>;

export const GetFeedQueryOutputSchema = z.object({
    items: z.array(PostSchema),
    nextCursor: z.string().nullable(),
});

export type GetFeedQueryOutput = z.infer<typeof GetFeedQueryOutputSchema>;

export const getFeedQuery: Query<{ input: GetFeedQueryInput, output: GetFeedQueryOutput }, {
    fetchPosts: (page: PageInput) => Promise<Page<Post>>
}> = async ({ input, dependencies }) => {
    return succeed(await dependencies.fetchPosts(input));
}

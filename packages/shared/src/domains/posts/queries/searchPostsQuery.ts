import z from "zod";
import type { Query } from "../../../types/query";
import { succeed } from "../../../utils/result";
import { PageInputSchema, type Page } from "../../../common/types/page";
import { PostSchema, type Post } from "../types/post";

export const SearchPostsQueryInputSchema = PageInputSchema.extend({
    query: z.string().trim().min(1).max(100),
});

export type SearchPostsQueryInput = z.infer<typeof SearchPostsQueryInputSchema>;

export const SearchPostsQueryOutputSchema = z.object({
    items: z.array(PostSchema),
    nextCursor: z.string().nullable(),
});

export type SearchPostsQueryOutput = z.infer<typeof SearchPostsQueryOutputSchema>;

/** Posts and listings whose content (or listing title) contains `query`, newest first. */
export const searchPostsQuery: Query<{ input: SearchPostsQueryInput, output: SearchPostsQueryOutput }, {
    searchPosts: (args: { query: string; cursor?: string | null; limit: number }) => Promise<Page<Post>>;
}> = async ({ input, dependencies }) => {
    const page = await dependencies.searchPosts(input);
    return succeed(page);
}

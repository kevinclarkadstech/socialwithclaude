import z from "zod";
import type { Query } from "../../../types/query";
import { succeed } from "../../../utils/result";
import { blockedEitherWay } from "../../../logic/authorization/conditions";
import { viewablePosts } from "../utils/canViewPost";
import { PageInputSchema, type Page } from "../../../common/types/page";
import { PostViewSchema, type PostView } from "../types/post";
import type { GetCallingUser } from "../../users/types/calling-user";

export const SearchPostsQueryInputSchema = PageInputSchema.extend({
    query: z.string().trim().min(1).max(100),
});

export type SearchPostsQueryInput = z.infer<typeof SearchPostsQueryInputSchema>;

export const SearchPostsQueryOutputSchema = z.object({
    items: z.array(PostViewSchema),
    nextCursor: z.string().nullable(),
});

export type SearchPostsQueryOutput = z.infer<typeof SearchPostsQueryOutputSchema>;

/** Posts and listings whose content (or listing title) contains `query`, newest first. */
export const searchPostsQuery: Query<{ input: SearchPostsQueryInput, output: SearchPostsQueryOutput }, {
    getCallingUser: GetCallingUser;
    searchPostViews: (args: { excludedCreatorIds: string[]; query: string; viewerId: string | null; cursor?: string | null; limit: number }) => Promise<Page<PostView>>;
}> = async ({ input, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    // Posts from anyone blocked either way are left out; the rest are checked one by one (canViewPost).
    const page = await dependencies.searchPostViews({
        ...input,
        viewerId: caller?.userId ?? null,
        excludedCreatorIds: blockedEitherWay(caller),
    });
    // A page can come back shorter than the limit; nextCursor still follows what was fetched.
    return succeed({ ...page, items: viewablePosts({ caller, posts: page.items }) });
}

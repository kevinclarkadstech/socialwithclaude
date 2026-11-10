import z from "zod";
import type { Query } from "../../../types/query";
import { succeed } from "../../../utils/result";
import { blockedEitherWay } from "../../../logic/authorization/conditions";
import { viewablePosts } from "../utils/canViewPost";
import { PageInputSchema, type Page } from "../../../common/types/page";
import { PostSchema, type Post } from "../types/post";
import type { GetCallingUser } from "../../users/types/calling-user";

export const GetFeedQueryInputSchema = PageInputSchema;

export type GetFeedQueryInput = z.infer<typeof GetFeedQueryInputSchema>;

export const GetFeedQueryOutputSchema = z.object({
    items: z.array(PostSchema),
    nextCursor: z.string().nullable(),
});

export type GetFeedQueryOutput = z.infer<typeof GetFeedQueryOutputSchema>;

/** Every post and listing, newest first. Only what the caller can see (canViewPost). */
export const getFeedQuery: Query<{ input: GetFeedQueryInput, output: GetFeedQueryOutput }, {
    getCallingUser: GetCallingUser;
    getPosts: (args: { excludedCreatorIds: string[]; viewerId: string | null; cursor?: string | null; limit: number }) => Promise<Page<Post>>;
}> = async ({ input, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    // Posts from anyone blocked either way are left out; the rest are checked one by one (canViewPost).
    const page = await dependencies.getPosts({
        ...input,
        viewerId: caller?.userId ?? null,
        excludedCreatorIds: blockedEitherWay(caller),
    });
    // A page can come back shorter than the limit; nextCursor still follows what was fetched.
    return succeed({ ...page, items: viewablePosts({ caller, posts: page.items }) });
}

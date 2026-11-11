import z from "zod";
import type { Query } from "../../../../types/query";
import { succeed } from "../../../../utils/result";
import { blockedEitherWay } from "../../../../common/authorization/conditions/conditions";
import { viewablePosts } from "../../utils/canViewPost";
import { PageInputSchema, type Page } from "../../../../common/types/page";
import { PostViewSchema, type PostView } from "../../types/post";
import { ListingStatusSchema, type ListingStatus } from "../../types/post-listing";
import type { GetCallingUser } from "../../../users/types/calling-user";

export const GetPostListingsQueryInputSchema = PageInputSchema.extend({
    status: ListingStatusSchema.optional(),
});

export type GetPostListingsQueryInput = z.infer<typeof GetPostListingsQueryInputSchema>;

export const GetPostListingsQueryOutputSchema = z.object({
    items: z.array(PostViewSchema),
    nextCursor: z.string().nullable(),
});

export type GetPostListingsQueryOutput = z.infer<typeof GetPostListingsQueryOutputSchema>;

/** Listings, newest first; only those with `status` if given. Only what the caller can see (canViewPost). */
export const getPostListingsQuery: Query<{ input: GetPostListingsQueryInput, output: GetPostListingsQueryOutput }, {
    getCallingUser: GetCallingUser;
    getListingPostViews: (args: { excludedCreatorIds: string[]; status?: ListingStatus; viewerId: string | null; cursor?: string | null; limit: number }) => Promise<Page<PostView>>;
}> = async ({ input, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    // Posts from anyone blocked either way are left out; the rest are checked one by one (canViewPost).
    const page = await dependencies.getListingPostViews({
        ...input,
        viewerId: caller?.userId ?? null,
        excludedCreatorIds: blockedEitherWay(caller),
    });
    // A page can come back shorter than the limit; nextCursor still follows what was fetched.
    return succeed({ ...page, items: viewablePosts({ caller, posts: page.items }) });
}

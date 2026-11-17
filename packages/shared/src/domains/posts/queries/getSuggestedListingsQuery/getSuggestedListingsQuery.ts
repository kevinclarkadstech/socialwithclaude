import z from "zod";
import type { Query } from "../../../../types/query";
import { succeed } from "../../../../utils/result";
import { blockedEitherWay } from "../../../../authorization/conditions/conditions";
import { viewablePosts } from "../../utils/viewablePosts/viewablePosts";
import { PostViewSchema, type PostView } from "../../types/post";
import type { GetCallingUser } from "../../../users/types/calling-user";

export const GetSuggestedListingsQueryInputSchema = z.object({
    limit: z.int().min(1).max(20).default(6),
});

export type GetSuggestedListingsQueryInput = z.infer<typeof GetSuggestedListingsQueryInputSchema>;

export const GetSuggestedListingsQueryOutputSchema = z.array(PostViewSchema);

export type GetSuggestedListingsQueryOutput = z.infer<typeof GetSuggestedListingsQueryOutputSchema>;

/**
 * Listings to suggest: available ones from people the caller follows first,
 * then everyone else's, newest first; never the caller's own. Only what the
 * caller can see (canViewPost), so there can be fewer than `limit`.
 */
export const getSuggestedListingsQuery: Query<{ input: GetSuggestedListingsQueryInput, output: GetSuggestedListingsQueryOutput }, {
    getCallingUser: GetCallingUser;
    getSuggestedListingViews: (args: { viewerId: string | null; excludedCreatorIds: string[]; limit: number }) => Promise<PostView[]>;
}> = async ({ input, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const listings = await dependencies.getSuggestedListingViews({
        viewerId: caller?.userId ?? null,
        excludedCreatorIds: caller ? [caller.userId, ...blockedEitherWay(caller)] : [],
        limit: input.limit,
    });
    return succeed(viewablePosts({ caller, posts: listings }));
};

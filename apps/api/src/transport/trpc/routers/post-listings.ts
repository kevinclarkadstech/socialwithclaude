import { GetPostListingsQueryInputSchema, GetSuggestedListingsQueryInputSchema, getPostListingsQuery, getSuggestedListingsQuery } from "@myapp/shared/domains";

import { getListingPostViews, getSuggestedListingViews } from "../../../data-access";
import { procedure, router } from "../trpc";

export const postListingsRouter = router({
    getListings: procedure.input(GetPostListingsQueryInputSchema).query(({ ctx, input }) =>
        getPostListingsQuery({ input, context: { logger: ctx.logger }, dependencies: { getCallingUser: ctx.getCallingUser, getListingPostViews } }),
    ),

    /** Listings to suggest beside Marketplace (see getSuggestedListingsQuery). */
    getSuggested: procedure.input(GetSuggestedListingsQueryInputSchema).query(({ ctx, input }) =>
        getSuggestedListingsQuery({ input, context: { logger: ctx.logger }, dependencies: { getCallingUser: ctx.getCallingUser, getSuggestedListingViews } }),
    ),
});

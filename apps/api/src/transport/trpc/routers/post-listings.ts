import { GetPostListingsQueryInputSchema, getPostListingsQuery } from "@myapp/shared/domains";

import { getListingPostViews } from "../../../data-access";
import { procedure, router } from "../trpc";

export const postListingsRouter = router({
    getListings: procedure.input(GetPostListingsQueryInputSchema).query(({ ctx, input }) =>
        getPostListingsQuery({ input, context: { logger: ctx.logger }, dependencies: { getCallingUser: ctx.getCallingUser, getListingPostViews } }),
    ),
});

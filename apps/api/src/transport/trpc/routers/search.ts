import {
    SearchPostsQueryInputSchema,
    SearchUserProfilesQueryInputSchema,
    searchPostsQuery,
    searchUserProfilesQuery,
} from "@myapp/shared/domains";

import { searchPostViews, searchUserProfiles } from "../../../data-access";
import { procedure, router } from "../trpc";

export const searchRouter = router({
    users: procedure.input(SearchUserProfilesQueryInputSchema).query(({ ctx, input }) =>
        searchUserProfilesQuery({ input, context: { logger: ctx.logger }, dependencies: { searchUserProfiles } }),
    ),

    posts: procedure.input(SearchPostsQueryInputSchema).query(({ ctx, input }) =>
        searchPostsQuery({ input, context: { logger: ctx.logger }, dependencies: { getCallingUser: ctx.getCallingUser, searchPostViews } }),
    ),
});

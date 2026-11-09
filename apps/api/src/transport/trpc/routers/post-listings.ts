import {
    CreatePostListingMutationInputSchema,
    GetPostListingsQueryInputSchema,
    UpdatePostListingMutationInputSchema,
    createPostListingMutation,
    getPostListingsQuery,
    updatePostListingMutation,
} from "@myapp/shared/domains";

import { createPostListing, getPostById, getPostListings, getPostMediaByIds, updatePostListing } from "../../../data-access";
import { deleteMedia } from "../../../domains/media/storage";
import { procedure, router } from "../trpc";

export const postListingsRouter = router({
    getListings: procedure.input(GetPostListingsQueryInputSchema).query(({ ctx, input }) =>
        getPostListingsQuery({ input, context: { logger: ctx.logger }, dependencies: { getCallingUser: ctx.getCallingUser, getPostListings } }),
    ),

    createListing: procedure.input(CreatePostListingMutationInputSchema).mutation(({ ctx, input }) =>
        createPostListingMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getPostById, getPostMediaByIds, createPostListing },
        }),
    ),

    updateListing: procedure.input(UpdatePostListingMutationInputSchema).mutation(({ ctx, input }) =>
        updatePostListingMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getPostById, getPostMediaByIds, deleteMedia, updatePostListing },
        }),
    ),
});

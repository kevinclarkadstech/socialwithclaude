import {
    CreatePostListingMutationInputSchema,
    GetPostListingsQueryInputSchema,
    UpdatePostListingMutationInputSchema,
    createPostListingMutation,
    getPostListingsQuery,
    updatePostListingMutation,
} from "@myapp/shared/domains";

import { createPostListing, getPostViewById, getPostListings, updatePostListing } from "../../../data-access";
import { deleteMedia } from "../../../storage";
import { publishPostPhotosWith } from "../../../storage/postPhotos";
import { procedure, router } from "../trpc";

export const postListingsRouter = router({
    getListings: procedure.input(GetPostListingsQueryInputSchema).query(({ ctx, input }) =>
        getPostListingsQuery({ input, context: { logger: ctx.logger }, dependencies: { getCallingUser: ctx.getCallingUser, getPostListings } }),
    ),

    createListing: procedure.input(CreatePostListingMutationInputSchema).mutation(({ ctx, input }) =>
        createPostListingMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getPostViewById, publishPostPhotos: publishPostPhotosWith(ctx.logger), createPostListing },
        }),
    ),

    updateListing: procedure.input(UpdatePostListingMutationInputSchema).mutation(({ ctx, input }) =>
        updatePostListingMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getPostViewById, publishPostPhotos: publishPostPhotosWith(ctx.logger), deleteMedia, updatePostListing },
        }),
    ),
});

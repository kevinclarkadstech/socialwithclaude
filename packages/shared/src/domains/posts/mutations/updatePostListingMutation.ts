import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { fail, succeed } from "../../../utils/result";
import { notFoundError } from "../../../error-handling";
import { canUpdatePost } from "../../../logic/authorization/posts/canUpdatePost";
import { logDisallowedResult } from "../../../logic/authorization/logDisallowedResult";
import type { GetCallingUser } from "../../users/types/calling-user";
import { PostSchema, type Post } from "../types/post";
import { checkPostMediaChoice, placePostMedia, removedPostMedia } from "../utils/postMediaChoice";
import { maxPostPhotos } from "../constants";
import { PostMediaChoiceSchema, type PostMediaPlacement, type UploadedPostMedia } from "../types/post-media";
import { postPhotoKeys } from "../utils/postPhotoKeys";
import {
    ListingPriceSchema,
    PostListingFieldsSchema,
    type ListingCondition,
    type ListingPrice,
    type ListingStatus,
} from "../types/post-listing";

export const UpdatePostListingMutationInputSchema = PostSchema.pick({ id: true, content: true })
    .extend(PostListingFieldsSchema.pick({ title: true, description: true, condition: true, status: true, isNegotiable: true }).shape)
    .extend({
        // All its photos, in order: ones it has, and new ones uploaded and confirmed first.
        media: z.array(PostMediaChoiceSchema).max(maxPostPhotos).default([]),
    })
    .and(ListingPriceSchema);

export type UpdatePostListingMutationInput = z.infer<typeof UpdatePostListingMutationInputSchema>;

export const UpdatePostListingMutationOutputSchema = PostSchema;

export type UpdatePostListingMutationOutput = z.infer<typeof UpdatePostListingMutationOutputSchema>;

/** Replaces a listing's content and details. Not found for a post that isn't a listing. */
export const updatePostListingMutation: Mutation<{ input: UpdatePostListingMutationInput, output: UpdatePostListingMutationOutput }, {
    getCallingUser: GetCallingUser;
    getPostById: (args: { id: string; viewerId: string | null }) => Promise<Post | null>;
    getPostMediaByIds: (args: { ids: string[] }) => Promise<UploadedPostMedia[]>;
    /** Deletes published photo files. */
    deleteMedia: (args: { keys: string[] }) => Promise<void>;
    /** Saves the listing, and sets its photos to `media`, taking `removedMediaIds` off it. Null if it was deleted. */
    updatePostListing: (args: {
        id: string;
        userId: string;
        content: string;
        media: PostMediaPlacement[];
        removedMediaIds: string[];
        title: string;
        description: string;
        condition: ListingCondition;
        status: ListingStatus;
        isNegotiable: boolean;
    } & ListingPrice) => Promise<Post | null>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const post = await dependencies.getPostById({ id: input.id, viewerId: caller?.userId ?? null });
    if (!post?.listing) {
        logger.info("Listing to update not found", { postId: input.id, isPost: Boolean(post) });
        return fail(notFoundError("Listing not found"));
    }

    const allowed = canUpdatePost({ caller, post });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "update-post-listing", callerId: caller?.userId, postId: post.id },
        });
        return allowed;
    }

    const found = input.media.length > 0 ? await dependencies.getPostMediaByIds({ ids: input.media.map((media) => media.id) }) : [];
    const mediaAllowed = checkPostMediaChoice({ callerId: allowed.value.userId, postId: post.id, chosen: input.media, found });
    if (!mediaAllowed.ok) {
        logger.warn("Listing photos refused", { postId: post.id, callerId: allowed.value.userId, error: mediaAllowed.error });
        return mediaAllowed;
    }
    const removed = removedPostMedia({ current: post.media, chosen: input.media });

    const updatedPost = await dependencies.updatePostListing({
        ...input,
        media: placePostMedia(input.media),
        removedMediaIds: removed.map((media) => media.id),
        userId: allowed.value.userId,
    });
    if (!updatedPost) {
        logger.info("Listing deleted before it could be updated", { postId: post.id });
        return fail(notFoundError("Listing not found"));
    }

    // The photos taken off it are gone for good (their addresses only reached people shown the post).
    if (removed.length > 0) {
        await dependencies.deleteMedia({ keys: removed.flatMap(postPhotoKeys) });
    }

    return succeed(updatedPost);
}

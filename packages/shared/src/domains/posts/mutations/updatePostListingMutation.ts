import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { fail, succeed } from "../../../utils/result";
import { notFoundError, validationError } from "../../../error-handling";
import { canUpdatePost } from "../../../logic/authorization/posts/canUpdatePost";
import { logDisallowedResult } from "../../../logic/authorization/logDisallowedResult";
import type { GetCallingUser } from "../../users/types/calling-user";
import { PostSchema, type Post } from "../types/post";
import { hasUniqueMedia, newPostMedia, removedPostMedia, savedPostMedia } from "../utils/postMedia";
import { maxPostPhotos } from "../constants";
import { PostMediaSchema, type PostMedia } from "../types/post-media";
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
        // All its photos: ones it has, and new ones uploaded first (createPostMediaUploadsMutation).
        media: z.array(PostMediaSchema).max(maxPostPhotos).default([]),
    })
    .and(ListingPriceSchema);

export type UpdatePostListingMutationInput = z.infer<typeof UpdatePostListingMutationInputSchema>;

export const UpdatePostListingMutationOutputSchema = PostSchema;

export type UpdatePostListingMutationOutput = z.infer<typeof UpdatePostListingMutationOutputSchema>;

/** Replaces a listing's content and details. Not found for a post that isn't a listing. */
export const updatePostListingMutation: Mutation<{ input: UpdatePostListingMutationInput, output: UpdatePostListingMutationOutput }, {
    getCallingUser: GetCallingUser;
    getPostById: (args: { id: string; viewerId: string | null }) => Promise<Post | null>;
    /** Publishes photos uploaded for the post; returns those it could, with their real dimensions. */
    publishPostPhotos: (args: { userId: string; postId: string; media: PostMedia[] }) => Promise<{ id: string; width: number; height: number }[]>;
    /** Deletes published photo files. */
    deleteMedia: (args: { keys: string[] }) => Promise<void>;
    /** Saves the listing, and makes its photos exactly `media`. Null if it was deleted. */
    updatePostListing: (args: {
        id: string;
        userId: string;
        content: string;
        media: PostMedia[];
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

    if (!hasUniqueMedia(input.media)) {
        return fail(validationError("The same photo is in there twice"));
    }
    // New photos were uploaded as they were picked: publish them now (any that can't be are left off).
    const added = newPostMedia({ current: post.media, media: input.media });
    const published = added.length > 0
        ? await dependencies.publishPostPhotos({ userId: post.createdBy, postId: post.id, media: added })
        : [];
    const media = savedPostMedia({ postId: post.id, userId: allowed.value.userId, media: input.media, current: post.media, published });
    const removed = removedPostMedia({ current: post.media, media: input.media });

    const updatedPost = await dependencies.updatePostListing({
        ...input,
        media,
        userId: allowed.value.userId,
    });
    if (!updatedPost) {
        logger.info("Listing deleted before it could be updated", { postId: post.id });
        return fail(notFoundError("Listing not found"));
    }

    // The photos taken off it are gone for good (their addresses only reached people shown the post).
    if (removed.length > 0) {
        await dependencies.deleteMedia({
            keys: removed.flatMap((item) => postPhotoKeys({ userId: post.createdBy, postId: post.id, mediaId: item.id })),
        });
    }

    return succeed(updatedPost);
}

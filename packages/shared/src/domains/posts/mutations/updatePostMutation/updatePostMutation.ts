import z from "zod";
import type { Mutation } from "../../../../types/mutation";
import { fail, succeed } from "../../../../utils/result";
import { notFoundError, validationError } from "../../../../error-handling";
import { canUpdatePost } from "../../authorization/canUpdatePost/canUpdatePost";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../../users/types/calling-user";
import { PostSchema, PostViewSchema, type Post, type PostView } from "../../types/post";
import { newPostMedia, removedPostMedia, savedPostMedia } from "../../logic/postMedia";
import { hasPostContent, validatePostMedia } from "../../validation/validatePostMedia";
import { maxPostPhotos } from "../../constants";
import { PostMediaSchema, type PostMedia } from "../../types/post-media";
import { ListingPriceSchema, PostListingFieldsSchema } from "../../types/post-listing";
import { photoKeys } from "../../../../media/utils";
import { postPhotoSizes } from "../../constants";

export const UpdatePostMutationInputSchema = PostSchema.pick({ id: true, content: true }).extend({
    // All its photos: ones it has, and new ones uploaded first (createPostMediaUploadsMutation).
    media: z.array(PostMediaSchema).max(maxPostPhotos).default([]),
    // For a listing: its details, replacing what it had (left as they are if not given).
    listing: PostListingFieldsSchema.pick({ title: true, description: true, condition: true, status: true, isNegotiable: true }).and(ListingPriceSchema).optional(),
});

export type UpdatePostMutationInput = z.infer<typeof UpdatePostMutationInputSchema>;

export const UpdatePostMutationOutputSchema = PostViewSchema;

export type UpdatePostMutationOutput = z.infer<typeof UpdatePostMutationOutputSchema>;

/**
 * Changes a post's text and photos (adding, removing and captioning them),
 * and a listing's details when `listing` is given. New photos are published
 * now; any that can't be are left off, which the app warns about.
 */
export const updatePostMutation: Mutation<{ input: UpdatePostMutationInput, output: UpdatePostMutationOutput }, {
    getCallingUser: GetCallingUser;
    getPostById: (args: { id: string }) => Promise<Post | null>;
    getPostMediaByPostId: (args: { postId: string }) => Promise<PostMedia[]>;
    /** Publishes photos uploaded for the post; returns those it could, with their real dimensions. */
    publishPostPhotos: (args: { userId: string; postId: string; media: PostMedia[] }) => Promise<{ id: string; width: number; height: number }[]>;
    /** Deletes published photo files. */
    deleteMedia: (args: { keys: string[] }) => Promise<void>;
    /** Saves the text and listing details, and makes the post's photos exactly `media`. Null if it was deleted. */
    updatePost: (args: { id: string; userId: string; content: string; media: PostMedia[]; listing?: UpdatePostMutationInput["listing"] }) => Promise<PostView | null>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const post = await dependencies.getPostById({ id: input.id });
    if (!post) {
        logger.info("Post to update not found", { postId: input.id });
        return fail(notFoundError("Post not found"));
    }

    const allowed = canUpdatePost({ caller, post });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "update-post", callerId: caller?.userId, postId: post.id },
        });
        return allowed;
    }

    if (input.listing && post.type !== "listing") {
        return fail(validationError("Only a listing has listing details"));
    }
    const valid = validatePostMedia(input);
    if (!valid.ok) {
        return valid;
    }
    const current = await dependencies.getPostMediaByPostId({ postId: post.id });
    // New photos were uploaded as they were picked: publish them now (any that can't be are left off).
    const added = newPostMedia({ current, media: input.media });
    const published = added.length > 0
        ? await dependencies.publishPostPhotos({ userId: post.createdBy, postId: post.id, media: added })
        : [];
    const media = savedPostMedia({ postId: post.id, userId: allowed.value.userId, media: input.media, current, published });
    const removed = removedPostMedia({ current, media: input.media });
    if (!hasPostContent({ content: input.content, media })) {
        return fail(validationError("Your photos didn't upload. Try adding them again."));
    }

    const updatedPost = await dependencies.updatePost({
        id: post.id,
        content: input.content,
        media,
        listing: input.listing,
        userId: allowed.value.userId,
    });
    if (!updatedPost) {
        logger.info("Post deleted before it could be updated", { postId: post.id });
        return fail(notFoundError("Post not found"));
    }

    // The photos taken off it are gone for good (their addresses only reached people shown the post).
    if (removed.length > 0) {
        await dependencies.deleteMedia({
            keys: removed.flatMap((item) => photoKeys({ userId: post.createdBy, parentId: post.id, photoId: item.id, sizes: postPhotoSizes })),
        });
    }

    return succeed(updatedPost);
}

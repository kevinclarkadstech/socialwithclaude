import z from "zod";
import type { Mutation } from "../../../../types/mutation";
import { fail, succeed } from "../../../../utils/result";
import { authorizationError, conflictError, validationError } from "../../../../error-handling";
import { requireCallerWithProfile } from "../../../../common/authorization/requireCaller/requireCaller";
import { logDisallowedResult } from "../../../../common/authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../../users/types/calling-user";
import { maxPostPhotos } from "../../constants";
import { PostSchema, PostViewSchema, type PostView } from "../../types/post";
import { PostMediaSchema, type PostMedia } from "../../types/post-media";
import { ListingPriceSchema, PostListingFieldsSchema } from "../../types/post-listing";
import { savedPostMedia } from "../../logic/postMedia";
import { hasPostContent, validatePostMedia } from "../../validation/validatePostMedia";

export const CreatePostMutationInputSchema = PostSchema.pick({ id: true, content: true }).extend({
    // Its photos, each uploaded first (createPostMediaUploadsMutation) under this post's id. The server sets
    // the post, who and when, and the photos' real sizes.
    media: z.array(PostMediaSchema).max(maxPostPhotos).default([]),
    // Given for a listing: its details. (Its description is also the post's text.)
    listing: PostListingFieldsSchema.pick({ title: true, description: true, condition: true, isNegotiable: true }).and(ListingPriceSchema).optional(),
});

export type CreatePostMutationInput = z.infer<typeof CreatePostMutationInputSchema>;

export const CreatePostMutationOutputSchema = PostViewSchema;

export type CreatePostMutationOutput = z.infer<typeof CreatePostMutationOutputSchema>;

/**
 * Creates a post (text, photos or both), or a listing when `listing` is
 * given. Its photos were uploaded as they
 * were picked; they're published now, and any that can't be (missing or not
 * a usable photo) are left off, which the app warns about. `id` is generated
 * by the client; retrying with it returns the post created the first time.
 */
export const createPostMutation: Mutation<{ input: CreatePostMutationInput, output: CreatePostMutationOutput }, {
    getCallingUser: GetCallingUser;
    isPostingEnabled: () => boolean;
    /** The post as it's shown: what a retried create returns. */
    getPostViewById: (args: { id: string; viewerId: string | null }) => Promise<PostView | null>;
    /** Publishes the post's uploaded photos; returns those it could, with their real dimensions. */
    publishPostPhotos: (args: { userId: string; postId: string; media: PostMedia[] }) => Promise<{ id: string; width: number; height: number }[]>;
    /** Creates the post with its photos (and listing details). Null if the id is already used. */
    createPost: (args: { id: string; userId: string; content: string; media: PostMedia[]; listing?: CreatePostMutationInput["listing"] }) => Promise<PostView | null>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = requireCallerWithProfile({ caller });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "create-post", callerId: caller?.userId },
        });
        return allowed;
    }
    const userId = allowed.value.userId;

    if (!dependencies.isPostingEnabled()) {
        logger.info("Posting is turned off", { callerId: userId });
        return fail(authorizationError("Posting is turned off"));
    }

    const existing = await dependencies.getPostViewById({ id: input.id, viewerId: userId });
    if (existing) {
        if (existing.createdBy === userId) {
            // A retry of a create that already worked.
            logger.info("Post already created", { postId: input.id, callerId: userId });
            return succeed(existing);
        }
        // Client ids are ULIDs, so a clash means the client reused one.
        logger.warn("Post id already used", { postId: input.id, callerId: userId });
        return fail(conflictError("Id is already used"));
    }

    const valid = validatePostMedia(input);
    if (!valid.ok) {
        return valid;
    }

    const published = input.media.length > 0
        ? await dependencies.publishPostPhotos({ userId, postId: input.id, media: input.media })
        : [];
    const media = savedPostMedia({ postId: input.id, userId, media: input.media, current: [], published });
    if (!hasPostContent({ content: input.content, media })) {
        return fail(validationError("Your photos didn't upload. Try adding them again."));
    }

    const createdPost = await dependencies.createPost({ id: input.id, userId, content: input.content, media, listing: input.listing });
    if (!createdPost) {
        // Created by another request in the meantime.
        logger.warn("Post id already used", { postId: input.id, callerId: userId });
        return fail(conflictError("Id is already used"));
    }
    return succeed(createdPost);
}

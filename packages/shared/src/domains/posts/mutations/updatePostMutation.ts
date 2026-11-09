import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { fail, succeed } from "../../../utils/result";
import { notFoundError, validationError } from "../../../error-handling";
import { canUpdatePost } from "../../../logic/authorization/posts/canUpdatePost";
import { logDisallowedResult } from "../../../logic/authorization/logDisallowedResult";
import type { GetCallingUser } from "../../users/types/calling-user";
import { PostSchema, type Post } from "../types/post";
import { checkPostMediaChoice, hasPostContent, placePostMedia, removedPostMedia } from "../utils/postMediaChoice";
import { maxPostPhotos } from "../constants";
import { PostMediaChoiceSchema, type PostMediaPlacement, type UploadedPostMedia } from "../types/post-media";
import { postPhotoKeys } from "../../media/utils/postPhotoKeys";

export const UpdatePostMutationInputSchema = PostSchema.pick({ id: true, content: true }).extend({
    // All its photos, in order: ones it has, and new ones uploaded and confirmed first.
    media: z.array(PostMediaChoiceSchema).max(maxPostPhotos).default([]),
});

export type UpdatePostMutationInput = z.infer<typeof UpdatePostMutationInputSchema>;

export const UpdatePostMutationOutputSchema = PostSchema;

export type UpdatePostMutationOutput = z.infer<typeof UpdatePostMutationOutputSchema>;

/** Changes a post's text and photos (adding, removing, reordering and captioning them). */
export const updatePostMutation: Mutation<{ input: UpdatePostMutationInput, output: UpdatePostMutationOutput }, {
    getCallingUser: GetCallingUser;
    getPostById: (args: { id: string; viewerId: string | null }) => Promise<Post | null>;
    getPostMediaByIds: (args: { ids: string[] }) => Promise<UploadedPostMedia[]>;
    /** Deletes published photo files. */
    deleteMedia: (args: { keys: string[] }) => Promise<void>;
    /** Saves the text, and sets the post's photos to `media`, taking `removedMediaIds` off it. Null if it was deleted. */
    updatePost: (args: { id: string; userId: string; content: string; media: PostMediaPlacement[]; removedMediaIds: string[] }) => Promise<Post | null>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const post = await dependencies.getPostById({ id: input.id, viewerId: caller?.userId ?? null });
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

    if (!hasPostContent(input)) {
        return fail(validationError("Write something or add a photo"));
    }
    const found = input.media.length > 0 ? await dependencies.getPostMediaByIds({ ids: input.media.map((media) => media.id) }) : [];
    const mediaAllowed = checkPostMediaChoice({ callerId: allowed.value.userId, postId: post.id, chosen: input.media, found });
    if (!mediaAllowed.ok) {
        logger.warn("Post photos refused", { postId: post.id, callerId: allowed.value.userId, error: mediaAllowed.error });
        return mediaAllowed;
    }
    const removed = removedPostMedia({ current: post.media, chosen: input.media });

    const updatedPost = await dependencies.updatePost({
        id: post.id,
        content: input.content,
        media: placePostMedia(input.media),
        removedMediaIds: removed.map((media) => media.id),
        userId: allowed.value.userId,
    });
    if (!updatedPost) {
        logger.info("Post deleted before it could be updated", { postId: post.id });
        return fail(notFoundError("Post not found"));
    }

    // The photos taken off it are gone for good (their addresses only reached people shown the post).
    if (removed.length > 0) {
        await dependencies.deleteMedia({ keys: removed.flatMap(postPhotoKeys) });
    }

    return succeed(updatedPost);
}

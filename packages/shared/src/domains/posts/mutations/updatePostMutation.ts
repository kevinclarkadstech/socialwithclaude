import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { fail, succeed } from "../../../utils/result";
import { notFoundError, validationError } from "../../../error-handling";
import { canUpdatePost } from "../../../logic/authorization/posts/canUpdatePost";
import { logDisallowedResult } from "../../../logic/authorization/logDisallowedResult";
import type { GetCallingUser } from "../../users/types/calling-user";
import { PostSchema, type Post } from "../types/post";
import { hasPostContent, hasUniqueMedia, newPostMedia, postMediaRows, removedPostMedia, type PostMediaFields, type PostMediaRow } from "../utils/postMedia";
import { maxPostPhotos } from "../constants";
import { PostMediaSchema } from "../types/post-media";
import { postPhotoKeys } from "../utils/postPhotoKeys";

export const UpdatePostMutationInputSchema = PostSchema.pick({ id: true, content: true }).extend({
    // All its photos, in order: ones it has, and new ones uploaded first (createPostMediaUploadsMutation).
    media: z.array(PostMediaSchema.pick({ id: true, caption: true, width: true, height: true, placeholder: true })).max(maxPostPhotos).default([]),
});

export type UpdatePostMutationInput = z.infer<typeof UpdatePostMutationInputSchema>;

export const UpdatePostMutationOutputSchema = PostSchema;

export type UpdatePostMutationOutput = z.infer<typeof UpdatePostMutationOutputSchema>;

/**
 * Changes a post's text and photos (adding, removing, reordering and
 * captioning them). New photos are published now; any that can't be are left
 * off, which the app warns about.
 */
export const updatePostMutation: Mutation<{ input: UpdatePostMutationInput, output: UpdatePostMutationOutput }, {
    getCallingUser: GetCallingUser;
    getPostById: (args: { id: string; viewerId: string | null }) => Promise<Post | null>;
    /** Publishes photos uploaded for the post; returns those it could, with their real dimensions. */
    publishPostPhotos: (args: { userId: string; postId: string; media: PostMediaFields[] }) => Promise<{ id: string; width: number; height: number }[]>;
    /** Deletes published photo files. */
    deleteMedia: (args: { keys: string[] }) => Promise<void>;
    /** Saves the text, and sets the post's photos to `media`, taking `removedMediaIds` off it. Null if it was deleted. */
    updatePost: (args: { id: string; userId: string; content: string; media: PostMediaRow[]; removedMediaIds: string[] }) => Promise<Post | null>;
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
    if (!hasUniqueMedia(input.media)) {
        return fail(validationError("The same photo is in there twice"));
    }
    // New photos were uploaded as they were picked: publish them now (any that can't be are left off).
    const added = newPostMedia({ current: post.media, media: input.media });
    const published = added.length > 0
        ? await dependencies.publishPostPhotos({ userId: post.createdBy, postId: post.id, media: added })
        : [];
    const media = postMediaRows({ media: input.media, current: post.media, published });
    const removed = removedPostMedia({ current: post.media, media: input.media });
    if (!hasPostContent({ content: input.content, media })) {
        return fail(validationError("Your photos didn't upload. Try adding them again."));
    }

    const updatedPost = await dependencies.updatePost({
        id: post.id,
        content: input.content,
        media,
        removedMediaIds: removed.map((media) => media.id),
        userId: allowed.value.userId,
    });
    if (!updatedPost) {
        logger.info("Post deleted before it could be updated", { postId: post.id });
        return fail(notFoundError("Post not found"));
    }

    // The photos taken off it are gone for good (their addresses only reached people shown the post).
    if (removed.length > 0) {
        await dependencies.deleteMedia({
            keys: removed.flatMap((item) => postPhotoKeys({ userId: post.createdBy, postId: post.id, mediaId: item.id })),
        });
    }

    return succeed(updatedPost);
}

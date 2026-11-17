import z from "zod";
import type { Mutation } from "../../../../types/mutation";
import { fail, succeed } from "../../../../utils/result";
import { notFoundError, validationError } from "../../../../error-handling";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import { maxPhotoUploadBytes } from "../../../../media/constants";
import { PhotoContentTypeSchema } from "../../../../media/types";
import { photoKey } from "../../../../media/utils";
import { postPhotoSizes } from "../../constants";
import { canCommentOnPost } from "../../authorization/canCommentOnPost/canCommentOnPost";
import { canUpdatePostComment } from "../../authorization/canUpdatePostComment/canUpdatePostComment";
import { hideUnviewablePost } from "../../utils/hideUnviewablePost/hideUnviewablePost";
import type { GetCallingUser } from "../../../users/types/calling-user";
import type { PostAccess } from "../../types/post-access";
import type { PostCommentView } from "../../types/post-comment";

export const CreatePostCommentPhotoUploadMutationInputSchema = z.object({
    postId: z.ulid(),
    // The comment it's for: a new one (its id made by the app) or one of the caller's being edited.
    postCommentId: z.ulid(),
    // Made by the app (a ULID).
    photoId: z.ulid(),
    // One file per size in postPhotoSizes (by the longer side), resized on the device.
    files: z.array(z.object({
        size: z.int().positive(),
        contentType: PhotoContentTypeSchema,
        contentLength: z.int().positive().max(maxPhotoUploadBytes),
    })).min(1),
});

export type CreatePostCommentPhotoUploadMutationInput = z.infer<typeof CreatePostCommentPhotoUploadMutationInputSchema>;

export const CreatePostCommentPhotoUploadMutationOutputSchema = z.object({
    // A presigned PUT per size. Storage refuses an upload whose Content-Type or size differs from what was declared.
    uploads: z.array(z.object({ size: z.int(), url: z.url(), contentType: PhotoContentTypeSchema })),
});

export type CreatePostCommentPhotoUploadMutationOutput = z.infer<typeof CreatePostCommentPhotoUploadMutationOutputSchema>;

/**
 * Upload URLs for every size of a comment's photo, as it's picked for a
 * comment being written (on a post the caller can comment on) or edited (one
 * of the caller's). Saving the comment publishes it; uploads never used
 * expire on their own.
 */
export const createPostCommentPhotoUploadMutation: Mutation<{ input: CreatePostCommentPhotoUploadMutationInput, output: CreatePostCommentPhotoUploadMutationOutput }, {
    getCallingUser: GetCallingUser;
    getPostAccessById: (args: { id: string; viewerId: string | null }) => Promise<PostAccess | null>;
    getPostCommentViewById: (args: { id: string; viewerId: string | null }) => Promise<PostCommentView | null>;
    createUploadUrl: (args: { key: string; contentType: string; contentLength: number }) => Promise<string>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const viewerId = caller?.userId ?? null;
    const existing = await dependencies.getPostCommentViewById({ id: input.postCommentId, viewerId });
    if (existing) {
        // Editing: only the caller's own comment.
        const canEdit = canUpdatePostComment({ caller, comment: existing });
        if (!canEdit.ok) {
            logDisallowedResult({ logger, result: canEdit, details: { action: "create-post-comment-photo-upload", callerId: caller?.userId, postCommentId: existing.id } });
            return canEdit;
        }
    } else {
        const post = await dependencies.getPostAccessById({ id: input.postId, viewerId });
        if (!post) {
            return fail(notFoundError("Post not found"));
        }
        const canComment = canCommentOnPost({ caller, post });
        if (!canComment.ok) {
            logDisallowedResult({ logger, result: canComment, details: { action: "create-post-comment-photo-upload", callerId: caller?.userId, postId: post.id } });
            return hideUnviewablePost({ error: canComment.error, message: "Post not found" });
        }
    }
    // Both checks above only pass for a signed-up caller.
    const userId = caller!.userId;

    const givenSizes = input.files.map((file) => file.size).sort((a, b) => a - b).join(",");
    if (givenSizes !== postPhotoSizes.join(",")) {
        logger.warn("Comment photo upload with the wrong sizes", { photoId: input.photoId, givenSizes });
        return fail(validationError(`A photo needs one file at each size: ${postPhotoSizes.join(",")}`));
    }

    const uploads = await Promise.all(input.files.map(async (file) => ({
        size: file.size,
        contentType: file.contentType,
        url: await dependencies.createUploadUrl({
            key: photoKey({ userId, parentId: input.postCommentId, photoId: input.photoId, size: file.size }),
            contentType: file.contentType,
            contentLength: file.contentLength,
        }),
    })));
    return succeed({ uploads });
};

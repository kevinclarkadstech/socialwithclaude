import z from "zod";
import { BaseUserCreatedEntitySchema } from "../../../types/base-user-created-entity";
import { PhotoPlaceholderSchema } from "../../../media/types";

/**
 * A comment's photo (a comment has at most one). Its files are at
 * `{commenter}/{postCommentId}/{id}-{size}` in the media bucket, one per
 * postPhotoSizes, like a post's photos.
 */
export const PostCommentPhotoSchema = BaseUserCreatedEntitySchema.extend({
    postCommentId: z.ulid(),
    // At the largest size; smaller sizes keep the shape.
    width: z.int().positive(),
    height: z.int().positive(),
    // A ThumbHash to show while it loads.
    placeholder: PhotoPlaceholderSchema.nullable(),
});

/** A photo the app picked for a comment: uploaded under its id (and the comment's), published when the comment is saved. */
export const PostCommentPhotoInputSchema = z.object({
    id: z.ulid(),
    placeholder: PhotoPlaceholderSchema.nullable(),
});

export type PostCommentPhoto = z.infer<typeof PostCommentPhotoSchema>;
export type PostCommentPhotoInput = z.infer<typeof PostCommentPhotoInputSchema>;

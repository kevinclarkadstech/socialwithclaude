import z from "zod";
import { BaseUserCreatedEntitySchema } from "../../../common/types/base-user-created-entity";
import { ImagePlaceholderSchema } from "../../../common/images/types";

/** A photo's caption (optional). */
export const PhotoCaptionSchema = z.string().trim().max(300);

/**
 * A photo on a post or listing. Its files are at
 * `{post creator}/{postId}/{id}-{size}` in the media bucket, one per
 * postPhotoSizes (by the longer side). A post shows its photos in the order
 * they were added (their ids are ULIDs).
 */
export const PostMediaSchema = BaseUserCreatedEntitySchema.extend({
    postId: z.ulid(),
    caption: PhotoCaptionSchema.nullable(),
    // At the largest size; smaller sizes keep the shape.
    width: z.int().positive(),
    height: z.int().positive(),
    // A ThumbHash to show while it loads.
    placeholder: ImagePlaceholderSchema.nullable(),
});

export type PostMedia = z.infer<typeof PostMediaSchema>;

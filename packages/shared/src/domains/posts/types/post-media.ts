import z from "zod";
import { maxPhotoPlaceholderLength } from "../../media/constants";

/** A photo's caption (optional). */
export const PhotoCaptionSchema = z.string().trim().max(300);

/** A photo on a post or listing. Its files are at `${path}-${size}` in the media bucket, one per postPhotoSizes. */
export const PostMediaSchema = z.object({
    id: z.ulid(),
    path: z.string().min(1),
    // At the largest size; smaller sizes keep the shape.
    width: z.int().positive(),
    height: z.int().positive(),
    // A ThumbHash (base64) to show while it loads.
    placeholder: z.string().max(maxPhotoPlaceholderLength).regex(/^[A-Za-z0-9+/]+=*$/).nullable(),
    caption: PhotoCaptionSchema.nullable(),
});

/** A photo as stored: who uploaded it, and the post it's on (null until it's added to one). */
export const UploadedPostMediaSchema = PostMediaSchema.extend({
    postId: z.ulid().nullable(),
    createdBy: z.ulid(),
});

/** A photo chosen for a post, in order: one already uploaded (confirmPostMediaUpload), or already on the post. */
export const PostMediaChoiceSchema = z.object({
    id: z.ulid(),
    caption: PhotoCaptionSchema.nullable(),
});

/** A photo's place on a post, as stored: its order and caption. */
export type PostMediaPlacement = { id: string; caption: string | null; position: number };

export type PostMedia = z.infer<typeof PostMediaSchema>;
export type UploadedPostMedia = z.infer<typeof UploadedPostMediaSchema>;
export type PostMediaChoice = z.infer<typeof PostMediaChoiceSchema>;

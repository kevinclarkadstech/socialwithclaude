import z from "zod";
import { MediaSchema } from "../../../common/images/types";

/** A photo's caption (optional). */
export const PhotoCaptionSchema = z.string().trim().max(300);

/** A photo on a post or listing: the published image, and its caption there. */
export const PostMediaSchema = MediaSchema.extend({
    caption: PhotoCaptionSchema.nullable(),
});

/** An uploaded photo as stored: who uploaded it, and the post it's on (null until a post is created or edited with it). */
export const UploadedPostMediaSchema = MediaSchema.extend({
    createdBy: z.ulid(),
    postId: z.ulid().nullable(),
});

/** A photo chosen for a post, in order: one just uploaded and confirmed, or one already on the post. */
export const PostMediaChoiceSchema = z.object({
    id: z.ulid(),
    caption: PhotoCaptionSchema.nullable(),
});

/** A photo's place on a post, as stored: its order and caption. */
export type PostMediaPlacement = { id: string; caption: string | null; position: number };

export type PostMedia = z.infer<typeof PostMediaSchema>;
export type UploadedPostMedia = z.infer<typeof UploadedPostMediaSchema>;
export type PostMediaChoice = z.infer<typeof PostMediaChoiceSchema>;

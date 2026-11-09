import z from "zod";
import { maxImagePlaceholderLength } from "../constants";

/** The image formats uploads may be in: WebP, or JPEG where the device can't encode WebP. */
export const ImageFormatSchema = z.enum(["webp", "jpeg"]);
export type ImageFormat = z.infer<typeof ImageFormatSchema>;

export const ImageContentTypeSchema = z.enum(["image/webp", "image/jpeg"]);
export type ImageContentType = z.infer<typeof ImageContentTypeSchema>;

/**
 * A published image (a media row): its files are at `${path}-${size}` in the
 * media bucket, one per size its owner stores. Whatever uses it (a post, a
 * comment, a chat message) links to it and decides who may.
 */
export const MediaSchema = z.object({
    id: z.ulid(),
    path: z.string().min(1),
    // At the largest size; smaller sizes keep the shape.
    width: z.int().positive(),
    height: z.int().positive(),
    // A ThumbHash (base64) to show while it loads.
    placeholder: z.string().max(maxImagePlaceholderLength).regex(/^[A-Za-z0-9+/]+=*$/).nullable(),
});
export type Media = z.infer<typeof MediaSchema>;

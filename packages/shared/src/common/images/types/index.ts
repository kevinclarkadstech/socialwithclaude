import z from "zod";
import { maxImagePlaceholderLength } from "../constants";

/** The image formats uploads may be in: WebP, or JPEG where the device can't encode WebP. */
export const ImageFormatSchema = z.enum(["webp", "jpeg"]);
export type ImageFormat = z.infer<typeof ImageFormatSchema>;

export const ImageContentTypeSchema = z.enum(["image/webp", "image/jpeg"]);
export type ImageContentType = z.infer<typeof ImageContentTypeSchema>;

/** A ThumbHash (base64) shown while an image loads. */
export const ImagePlaceholderSchema = z.string().max(maxImagePlaceholderLength).regex(/^[A-Za-z0-9+/]+=*$/);

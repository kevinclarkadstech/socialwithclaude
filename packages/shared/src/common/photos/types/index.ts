import z from "zod";
import { maxPhotoPlaceholderLength } from "../constants";

/** The photo formats uploads may be in: WebP, or JPEG where the device can't encode WebP. */
export const PhotoFormatSchema = z.enum(["webp", "jpeg"]);
export type PhotoFormat = z.infer<typeof PhotoFormatSchema>;

export const PhotoContentTypeSchema = z.enum(["image/webp", "image/jpeg"]);
export type PhotoContentType = z.infer<typeof PhotoContentTypeSchema>;

/** A ThumbHash (base64) shown while a photo loads. */
export const PhotoPlaceholderSchema = z.string().max(maxPhotoPlaceholderLength).regex(/^[A-Za-z0-9+/]+=*$/);

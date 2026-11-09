import z from "zod";

/** The image formats uploads may be in: WebP, or JPEG where the device can't encode WebP. */
export const ImageFormatSchema = z.enum(["webp", "jpeg"]);
export type ImageFormat = z.infer<typeof ImageFormatSchema>;

export const ImageContentTypeSchema = z.enum(["image/webp", "image/jpeg"]);
export type ImageContentType = z.infer<typeof ImageContentTypeSchema>;

/** A profile's two images: its avatar and its cover. */
export const ProfileImageKindSchema = z.enum(["avatar", "cover"]);
export type ProfileImageKind = z.infer<typeof ProfileImageKindSchema>;

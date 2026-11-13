import z from "zod";

/** A profile's two photos: its avatar and its cover. */
export const ProfilePhotoKindSchema = z.enum(["avatar", "cover"]);
export type ProfilePhotoKind = z.infer<typeof ProfilePhotoKindSchema>;

/**
 * How publishing an uploaded profile photo went: published, or not because a
 * width never arrived ("missing") or isn't a photo of the right size
 * ("unusable"). `detail` says which, for the logs.
 */
export type PublishProfilePhotoResult = { status: "published" } | { status: "missing" | "unusable"; detail: string };

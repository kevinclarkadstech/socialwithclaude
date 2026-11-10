import z from "zod";

/** A profile's two photos: its avatar and its cover. */
export const ProfilePhotoKindSchema = z.enum(["avatar", "cover"]);
export type ProfilePhotoKind = z.infer<typeof ProfilePhotoKindSchema>;

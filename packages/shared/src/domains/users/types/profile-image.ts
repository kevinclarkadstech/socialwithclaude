import z from "zod";

/** A profile's two images: its avatar and its cover. */
export const ProfileImageKindSchema = z.enum(["avatar", "cover"]);
export type ProfileImageKind = z.infer<typeof ProfileImageKindSchema>;

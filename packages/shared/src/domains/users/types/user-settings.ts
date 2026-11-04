import z from "zod";
import { BaseEntityFieldsSchema } from "../../../common/types/base-entity-fields";

export const ProfileVisibilitySchema = z.enum(["public", "followers"]);

export const UserSettingsSchema = BaseEntityFieldsSchema.omit({ id: true }).extend({
    userId: z.ulid(),
    // Display
    darkModeEnabled: z.boolean().default(false),
    // Privacy and security
    followersCanTag: z.boolean().default(true),
    nonFollowersCanTag: z.boolean().default(false),
    profileVisibility: ProfileVisibilitySchema,
});

export type ProfileVisibility = z.infer<typeof ProfileVisibilitySchema>;
export type UserSettings = z.infer<typeof UserSettingsSchema>;

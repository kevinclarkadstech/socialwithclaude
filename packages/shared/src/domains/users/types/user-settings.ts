import z from "zod";
import { BaseEntityFieldsSchema } from "../../../types/base-entity-fields";

export const ProfileVisibilitySchema = z.enum(["public", "followers"]);

export const UserSettingsSchema = BaseEntityFieldsSchema.omit({ id: true }).extend({
    userId: z.ulid(),
    // Display
    darkModeEnabled: z.boolean().default(false),
    // Privacy and security
    followersCanTag: z.boolean().default(true),
    nonFollowersCanTag: z.boolean().default(false),
    profileVisibility: ProfileVisibilitySchema,
    // Push notifications, by kind (see pushSettingFor). Warnings and report outcomes always go.
    pushMessages: z.boolean().default(true),
    pushComments: z.boolean().default(true),
    pushMentions: z.boolean().default(true),
    pushFollows: z.boolean().default(true),
});

export type ProfileVisibility = z.infer<typeof ProfileVisibilitySchema>;
export type UserSettings = z.infer<typeof UserSettingsSchema>;

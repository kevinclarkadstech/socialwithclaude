import z from "zod";
import { BaseEntityFieldsSchema } from "../../../common/types/base-entity-fields";

export const UserSettingsSchema = z.object({
    userId: z.ulid(),
    // Display
    darkModeEnabled: z.boolean().default(false),
    // Privacy and security
    followersCanTag: z.boolean().default(true),
    nonFollowersCanTag: z.boolean().default(false),
    profileVisibility: z.enum(["public", "followers"]),
}).and(BaseEntityFieldsSchema.omit({ id: true }));

export type UserSettings = z.infer<typeof UserSettingsSchema>;
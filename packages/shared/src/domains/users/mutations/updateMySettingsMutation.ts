import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { succeed } from "../../../utils/result";
import { notFound } from "../../../utils/failures";
import { requireCallerWithProfile } from "../../../logic/authorization/requireCaller";
import type { GetCallingUser } from "../types/calling-user";
import { UserSettingsSchema, type UserSettings } from "../types/user-settings";

export const UpdateMySettingsMutationInputSchema = UserSettingsSchema.pick({
    darkModeEnabled: true,
    followersCanTag: true,
    nonFollowersCanTag: true,
    profileVisibility: true,
}).partial();

export type UpdateMySettingsMutationInput = z.infer<typeof UpdateMySettingsMutationInputSchema>;

export const UpdateMySettingsMutationOutputSchema = UserSettingsSchema;

export type UpdateMySettingsMutationOutput = z.infer<typeof UpdateMySettingsMutationOutputSchema>;

/** Changes only the settings given. */
export const updateMySettingsMutation: Mutation<{ input: UpdateMySettingsMutationInput, output: UpdateMySettingsMutationOutput }, {
    getCallingUser: GetCallingUser;
    updateUserSettings: (args: { userId: string } & UpdateMySettingsMutationInput) => Promise<UserSettings | null>;
}> = async ({ input, dependencies }) => {
    const allowed = requireCallerWithProfile(await dependencies.getCallingUser());
    if (!allowed.ok) return allowed;

    const settings = await dependencies.updateUserSettings({ ...input, userId: allowed.value.userId });
    if (!settings) return notFound("Settings not found");
    return succeed(settings);
}

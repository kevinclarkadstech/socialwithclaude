import z from "zod";
import type { Mutation } from "../../../../types/mutation";
import { fail, succeed } from "../../../../utils/result";
import { notFoundError } from "../../../../error-handling";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../types/calling-user";
import { UserSettingsSchema, type UserSettings } from "../../types/user-settings";
import { canUpdateMySettings } from "../../authorization/canUpdateMySettings/canUpdateMySettings";

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
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = canUpdateMySettings({ caller });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "update-my-settings", callerId: caller?.userId },
        });
        return allowed;
    }

    const settings = await dependencies.updateUserSettings({ ...input, userId: allowed.value.userId });
    if (!settings) {
        // Sign-up creates settings with the profile, so this means broken data.
        logger.error("Settings missing for a user with a profile", { callerId: allowed.value.userId });
        return fail(notFoundError("Settings not found"));
    }

    return succeed(settings);
}

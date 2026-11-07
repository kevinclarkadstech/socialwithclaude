import z from "zod";
import type { Query } from "../../../types/query";
import { fail, succeed } from "../../../utils/result";
import { notFoundError } from "../../../error-handling";
import { requireCallerWithProfile } from "../../../logic/authorization/requireCaller";
import { logDisallowedResult } from "../../../logic/authorization/logDisallowedResult";
import type { GetCallingUser } from "../types/calling-user";
import { UserSettingsSchema, type UserSettings } from "../types/user-settings";

export const GetMySettingsQueryInputSchema = z.object({}).default({});

export type GetMySettingsQueryInput = z.infer<typeof GetMySettingsQueryInputSchema>;

export const GetMySettingsQueryOutputSchema = UserSettingsSchema;

export type GetMySettingsQueryOutput = z.infer<typeof GetMySettingsQueryOutputSchema>;

export const getMySettingsQuery: Query<{ input: GetMySettingsQueryInput, output: GetMySettingsQueryOutput }, {
    getCallingUser: GetCallingUser;
    getUserSettings: (args: { userId: string }) => Promise<UserSettings | null>;
}> = async ({ context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = requireCallerWithProfile({ caller });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "get-my-settings", callerId: caller?.userId },
        });
        return allowed;
    }

    const settings = await dependencies.getUserSettings({ userId: allowed.value.userId });
    if (!settings) {
        // Sign-up creates settings with the profile, so this means broken data.
        logger.error("Settings missing for a user with a profile", { callerId: allowed.value.userId });
        return fail(notFoundError("Settings not found"));
    }

    return succeed(settings);
}

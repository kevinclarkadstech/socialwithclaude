import z from "zod";
import type { Query } from "../../../types/query";
import { succeed } from "../../../utils/result";
import { notFound } from "../../../utils/failures";
import { requireCallerWithProfile } from "../../../logic/authorization/requireCaller";
import type { GetCallingUser } from "../types/calling-user";
import { UserSettingsSchema, type UserSettings } from "../types/user-settings";

export const GetMySettingsQueryInputSchema = z.object({}).default({});

export type GetMySettingsQueryInput = z.infer<typeof GetMySettingsQueryInputSchema>;

export const GetMySettingsQueryOutputSchema = UserSettingsSchema;

export type GetMySettingsQueryOutput = z.infer<typeof GetMySettingsQueryOutputSchema>;

export const getMySettingsQuery: Query<{ input: GetMySettingsQueryInput, output: GetMySettingsQueryOutput }, {
    getCallingUser: GetCallingUser;
    getUserSettings: (args: { userId: string }) => Promise<UserSettings | null>;
}> = async ({ dependencies }) => {
    const allowed = requireCallerWithProfile(await dependencies.getCallingUser());
    if (!allowed.ok) return allowed;

    const settings = await dependencies.getUserSettings({ userId: allowed.value.userId });
    if (!settings) return notFound("Settings not found");
    return succeed(settings);
}

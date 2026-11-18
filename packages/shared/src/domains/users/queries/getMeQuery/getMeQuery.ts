import z from "zod";
import type { Query } from "../../../../types/query";
import { succeed } from "../../../../utils/result";
import { CallingUserSchema, type GetCallingUser } from "../../types/calling-user";

export const GetMeQueryInputSchema = z.object({}).default({});

export type GetMeQueryInput = z.infer<typeof GetMeQueryInputSchema>;

export const GetMeQueryOutputSchema = CallingUserSchema.nullable();

export type GetMeQueryOutput = z.infer<typeof GetMeQueryOutputSchema>;

/**
 * The caller, or null when signed out. `profile` is null until sign-up is
 * complete, and `deletionScheduledAt` set while their account is scheduled
 * for deletion (when the app offers only to restore it). Clients use it as
 * their getCallingUser dependency.
 */
export const getMeQuery: Query<{ input: GetMeQueryInput, output: GetMeQueryOutput }, {
    getCallingUser: GetCallingUser;
}> = async ({ dependencies }) => {
    const caller = await dependencies.getCallingUser();
    if (!caller) {
        return succeed(null);
    }

    return succeed(caller);
}

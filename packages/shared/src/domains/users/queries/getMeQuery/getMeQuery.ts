import z from "zod";
import type { Query } from "../../../../types/query";
import { succeed } from "../../../../utils/result";
import { SignedInUserSchema, type SignedInUser } from "../../types/calling-user";

export const GetMeQueryInputSchema = z.object({}).default({});

export type GetMeQueryInput = z.infer<typeof GetMeQueryInputSchema>;

export const GetMeQueryOutputSchema = SignedInUserSchema.nullable();

export type GetMeQueryOutput = z.infer<typeof GetMeQueryOutputSchema>;

/**
 * The signed-in user with their profile and block list, or null when signed
 * out. `profile` is null until sign-up is complete. Clients load it once and
 * use it as their getCallingUser dependency.
 */
export const getMeQuery: Query<{ input: GetMeQueryInput, output: GetMeQueryOutput }, {
    getSignedInUser: () => Promise<SignedInUser | null>;
}> = async ({ dependencies }) => {
    return succeed(await dependencies.getSignedInUser());
}

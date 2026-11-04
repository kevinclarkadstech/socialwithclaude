import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { succeed } from "../../../utils/result";
import { requireCaller } from "../../../logic/authorization/requireCaller";
import type { GetCallingUser } from "../../users/types/calling-user";

export const RevokeOtherSessionsMutationInputSchema = z.object({}).default({});

export type RevokeOtherSessionsMutationInput = z.infer<typeof RevokeOtherSessionsMutationInputSchema>;

export const RevokeOtherSessionsMutationOutputSchema = z.undefined();

export type RevokeOtherSessionsMutationOutput = z.infer<typeof RevokeOtherSessionsMutationOutputSchema>;

/** Signs every device out except this one. */
export const revokeOtherSessionsMutation: Mutation<{ input: RevokeOtherSessionsMutationInput, output: RevokeOtherSessionsMutationOutput }, {
    getCallingUser: GetCallingUser;
    revokeOtherSessions: () => Promise<void>;
}> = async ({ dependencies }) => {
    const allowed = requireCaller(await dependencies.getCallingUser());
    if (!allowed.ok) return allowed;

    await dependencies.revokeOtherSessions();
    return succeed();
}

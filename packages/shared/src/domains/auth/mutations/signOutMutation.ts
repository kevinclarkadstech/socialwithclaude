import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { succeed } from "../../../utils/result";
import type { GetCallingUser } from "../../users/types/calling-user";

export const SignOutMutationInputSchema = z.object({}).default({});

export type SignOutMutationInput = z.infer<typeof SignOutMutationInputSchema>;

export const SignOutMutationOutputSchema = z.undefined();

export type SignOutMutationOutput = z.infer<typeof SignOutMutationOutputSchema>;

/** Signs this device out. Signed-out callers have nothing to clear, so that succeeds too. */
export const signOutMutation: Mutation<{ input: SignOutMutationInput, output: SignOutMutationOutput }, {
    getCallingUser: GetCallingUser;
    signOut: () => Promise<void>;
}> = async ({ dependencies }) => {
    if (!(await dependencies.getCallingUser())) return succeed();

    await dependencies.signOut();
    return succeed();
}

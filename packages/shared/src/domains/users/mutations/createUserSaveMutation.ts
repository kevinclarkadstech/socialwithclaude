import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { succeed } from "../../../utils/result";
import { requireCallerWithProfile } from "../../../logic/authorization/requireCaller";
import type { GetCallingUser } from "../types/calling-user";
import { UserSaveTypeSchema, type UserSaveType } from "../types/user-save";

export const CreateUserSaveMutationInputSchema = z.object({
    type: UserSaveTypeSchema,
    id: z.ulid(),
});

export type CreateUserSaveMutationInput = z.infer<typeof CreateUserSaveMutationInputSchema>;

export const CreateUserSaveMutationOutputSchema = z.undefined();

export type CreateUserSaveMutationOutput = z.infer<typeof CreateUserSaveMutationOutputSchema>;

/** Saves a post, comment or chat message. Saving again succeeds. */
export const createUserSaveMutation: Mutation<{ input: CreateUserSaveMutationInput, output: CreateUserSaveMutationOutput }, {
    getCallingUser: GetCallingUser;
    createUserSave: (args: { userId: string; type: UserSaveType; id: string }) => Promise<boolean>;
}> = async ({ input, dependencies }) => {
    const allowed = requireCallerWithProfile(await dependencies.getCallingUser());
    if (!allowed.ok) return allowed;

    await dependencies.createUserSave({ ...input, userId: allowed.value.userId });
    return succeed();
}

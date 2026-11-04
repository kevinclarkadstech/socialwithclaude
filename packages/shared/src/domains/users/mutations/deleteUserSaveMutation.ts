import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { succeed } from "../../../utils/result";
import { requireCallerWithProfile } from "../../../logic/authorization/requireCaller";
import type { GetCallingUser } from "../types/calling-user";
import { UserSaveTypeSchema, type UserSaveType } from "../types/user-save";

export const DeleteUserSaveMutationInputSchema = z.object({
    type: UserSaveTypeSchema,
    id: z.ulid(),
});

export type DeleteUserSaveMutationInput = z.infer<typeof DeleteUserSaveMutationInputSchema>;

export const DeleteUserSaveMutationOutputSchema = z.undefined();

export type DeleteUserSaveMutationOutput = z.infer<typeof DeleteUserSaveMutationOutputSchema>;

/** Unsaves a post, comment or chat message. Unsaving something that isn't saved succeeds. */
export const deleteUserSaveMutation: Mutation<{ input: DeleteUserSaveMutationInput, output: DeleteUserSaveMutationOutput }, {
    getCallingUser: GetCallingUser;
    deleteUserSave: (args: { userId: string; type: UserSaveType; id: string }) => Promise<boolean>;
}> = async ({ input, dependencies }) => {
    const allowed = requireCallerWithProfile(await dependencies.getCallingUser());
    if (!allowed.ok) return allowed;

    await dependencies.deleteUserSave({ ...input, userId: allowed.value.userId });
    return succeed();
}

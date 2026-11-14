import z from "zod";
import type { Mutation } from "../../../../types/mutation";
import { succeed } from "../../../../utils/result";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../types/calling-user";
import { UserSaveTypeSchema, type UserSaveType } from "../../types/user-save";
import { canUnsaveItem } from "../../authorization/canUnsaveItem/canUnsaveItem";

export const DeleteUserSaveMutationInputSchema = z.object({
    type: UserSaveTypeSchema,
    id: z.ulid(),
});

export type DeleteUserSaveMutationInput = z.infer<typeof DeleteUserSaveMutationInputSchema>;

export const DeleteUserSaveMutationOutputSchema = z.null();

export type DeleteUserSaveMutationOutput = z.infer<typeof DeleteUserSaveMutationOutputSchema>;

/** Unsaves a post, comment or chat message. Unsaving something that isn't saved succeeds. */
export const deleteUserSaveMutation: Mutation<{ input: DeleteUserSaveMutationInput, output: DeleteUserSaveMutationOutput }, {
    getCallingUser: GetCallingUser;
    deleteUserSave: (args: { userId: string; type: UserSaveType; id: string }) => Promise<boolean>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = canUnsaveItem({ caller });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "delete-user-save", callerId: caller?.userId },
        });
        return allowed;
    }

    await dependencies.deleteUserSave({ ...input, userId: allowed.value.userId });
    return succeed();
}

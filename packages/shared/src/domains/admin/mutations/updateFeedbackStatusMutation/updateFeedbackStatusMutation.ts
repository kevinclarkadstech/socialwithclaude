import z from "zod";
import type { Mutation } from "../../../../types/mutation";
import { fail, succeed } from "../../../../utils/result";
import { notFoundError } from "../../../../error-handling";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../../users/types/calling-user";
import { UserFeedbackSchema, type UserFeedbackStatus } from "../../../users/types/user-feedback";
import { canAdminister } from "../../authorization/canAdminister/canAdminister";

export const UpdateFeedbackStatusMutationInputSchema = UserFeedbackSchema.pick({ id: true, status: true });

export type UpdateFeedbackStatusMutationInput = z.infer<typeof UpdateFeedbackStatusMutationInputSchema>;

export const UpdateFeedbackStatusMutationOutputSchema = z.null();

export type UpdateFeedbackStatusMutationOutput = z.infer<typeof UpdateFeedbackStatusMutationOutputSchema>;

/** Marks feedback new, read or done. Admins only. */
export const updateFeedbackStatusMutation: Mutation<{ input: UpdateFeedbackStatusMutationInput, output: UpdateFeedbackStatusMutationOutput }, {
    getCallingUser: GetCallingUser;
    /** False if there's no such feedback. */
    updateUserFeedbackStatus: (args: { id: string; status: UserFeedbackStatus }) => Promise<boolean>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = canAdminister({ caller });
    if (!allowed.ok) {
        logDisallowedResult({ logger, result: allowed, details: { action: "update-feedback-status", callerId: caller?.userId } });
        return allowed;
    }

    const updated = await dependencies.updateUserFeedbackStatus(input);
    if (!updated) {
        return fail(notFoundError("Feedback not found"));
    }
    return succeed();
};

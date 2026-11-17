import z from "zod";
import type { Mutation } from "../../../../types/mutation";
import { succeed } from "../../../../utils/result";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../../users/types/calling-user";
import { canReadMyNotifications } from "../../authorization/canReadMyNotifications/canReadMyNotifications";

export const MarkNotificationsReadMutationInputSchema = z.object({}).default({});

export type MarkNotificationsReadMutationInput = z.infer<typeof MarkNotificationsReadMutationInputSchema>;

export const MarkNotificationsReadMutationOutputSchema = z.null();

export type MarkNotificationsReadMutationOutput = z.infer<typeof MarkNotificationsReadMutationOutputSchema>;

/** Marks all of the caller's notifications read (they opened the Notifications page). */
export const markNotificationsReadMutation: Mutation<{ input: MarkNotificationsReadMutationInput, output: MarkNotificationsReadMutationOutput }, {
    getCallingUser: GetCallingUser;
    markNotificationsRead: (args: { userId: string }) => Promise<number>;
}> = async ({ context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = canReadMyNotifications({ caller });
    if (!allowed.ok) {
        logDisallowedResult({ logger, result: allowed, details: { action: "mark-notifications-read", callerId: caller?.userId } });
        return allowed;
    }
    await dependencies.markNotificationsRead({ userId: allowed.value.userId });
    return succeed();
};

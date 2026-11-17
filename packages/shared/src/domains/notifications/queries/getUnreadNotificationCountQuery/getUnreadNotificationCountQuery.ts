import z from "zod";
import type { Query } from "../../../../types/query";
import { succeed } from "../../../../utils/result";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../../users/types/calling-user";
import { canReadMyNotifications } from "../../authorization/canReadMyNotifications/canReadMyNotifications";

export const GetUnreadNotificationCountQueryInputSchema = z.object({}).default({});

export type GetUnreadNotificationCountQueryInput = z.infer<typeof GetUnreadNotificationCountQueryInputSchema>;

export const GetUnreadNotificationCountQueryOutputSchema = z.object({
    count: z.int().min(0),
});

export type GetUnreadNotificationCountQueryOutput = z.infer<typeof GetUnreadNotificationCountQueryOutputSchema>;

/** How many of the caller's notifications they haven't seen: the number on the bell. */
export const getUnreadNotificationCountQuery: Query<{ input: GetUnreadNotificationCountQueryInput, output: GetUnreadNotificationCountQueryOutput }, {
    getCallingUser: GetCallingUser;
    countUnreadNotifications: (args: { userId: string }) => Promise<number>;
}> = async ({ context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = canReadMyNotifications({ caller });
    if (!allowed.ok) {
        logDisallowedResult({ logger, result: allowed, details: { action: "get-unread-notification-count", callerId: caller?.userId } });
        return allowed;
    }
    const count = await dependencies.countUnreadNotifications({ userId: allowed.value.userId });
    return succeed({ count });
};

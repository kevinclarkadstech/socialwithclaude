import z from "zod";
import type { Query } from "../../../../types/query";
import { succeed } from "../../../../utils/result";
import { PageInputSchema, type Page } from "../../../../types/page";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../../users/types/calling-user";
import { canReadMyNotifications } from "../../authorization/canReadMyNotifications/canReadMyNotifications";
import { NotificationSchema, type Notification } from "../../types/notification";

export const GetMyNotificationsQueryInputSchema = PageInputSchema;

export type GetMyNotificationsQueryInput = z.infer<typeof GetMyNotificationsQueryInputSchema>;

export const GetMyNotificationsQueryOutputSchema = z.object({
    items: z.array(NotificationSchema),
    nextCursor: z.string().nullable(),
});

export type GetMyNotificationsQueryOutput = z.infer<typeof GetMyNotificationsQueryOutputSchema>;

/** The caller's notifications, newest first. */
export const getMyNotificationsQuery: Query<{ input: GetMyNotificationsQueryInput, output: GetMyNotificationsQueryOutput }, {
    getCallingUser: GetCallingUser;
    getUserNotifications: (args: { userId: string; cursor: string | null; limit: number }) => Promise<Page<Notification>>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = canReadMyNotifications({ caller });
    if (!allowed.ok) {
        logDisallowedResult({ logger, result: allowed, details: { action: "get-my-notifications", callerId: caller?.userId } });
        return allowed;
    }
    const page = await dependencies.getUserNotifications({ userId: allowed.value.userId, cursor: input.cursor ?? null, limit: input.limit });
    return succeed(page);
};

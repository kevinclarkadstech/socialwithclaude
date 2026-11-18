import {
    GetMyNotificationsQueryInputSchema,
    GetUnreadNotificationCountQueryInputSchema,
    MarkNotificationsReadMutationInputSchema,
    RegisterPushTokenMutationInputSchema,
    UnregisterPushTokenMutationInputSchema,
    getMyNotificationsQuery,
    getUnreadNotificationCountQuery,
    markNotificationsReadMutation,
    registerPushTokenMutation,
    unregisterPushTokenMutation,
} from "@myapp/shared/domains";

import { countUnreadNotifications, deletePushToken, getUserNotifications, markNotificationsRead, savePushToken } from "../../../data-access";
import { procedure, router } from "../trpc";

/** The caller's own notifications: the list, the number on the bell, marking them read, and push on this device. */
export const notificationsRouter = router({
    getMine: procedure.input(GetMyNotificationsQueryInputSchema).query(({ ctx, input }) =>
        getMyNotificationsQuery({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getUserNotifications },
        }),
    ),

    getUnreadCount: procedure.input(GetUnreadNotificationCountQueryInputSchema).query(({ ctx, input }) =>
        getUnreadNotificationCountQuery({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, countUnreadNotifications },
        }),
    ),

    markAllRead: procedure.input(MarkNotificationsReadMutationInputSchema).mutation(({ ctx, input }) =>
        markNotificationsReadMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, markNotificationsRead },
        }),
    ),

    /** Sends the caller's push notifications to this device (its Firebase token), while they're signed in on it. */
    registerPushToken: procedure.input(RegisterPushTokenMutationInputSchema).mutation(({ ctx, input }) =>
        registerPushTokenMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, savePushToken },
        }),
    ),

    /** Stops push notifications to this device. */
    unregisterPushToken: procedure.input(UnregisterPushTokenMutationInputSchema).mutation(({ ctx, input }) =>
        unregisterPushTokenMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, deletePushToken },
        }),
    ),
});

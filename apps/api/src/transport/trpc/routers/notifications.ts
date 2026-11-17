import {
    GetMyNotificationsQueryInputSchema,
    GetUnreadNotificationCountQueryInputSchema,
    MarkNotificationsReadMutationInputSchema,
    getMyNotificationsQuery,
    getUnreadNotificationCountQuery,
    markNotificationsReadMutation,
} from "@myapp/shared/domains";

import { countUnreadNotifications, getUserNotifications, markNotificationsRead } from "../../../data-access";
import { procedure, router } from "../trpc";

/** The caller's own notifications: the list, the number on the bell, and marking them read. */
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
});

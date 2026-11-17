import {
    BanUserMutationInputSchema,
    GetFeedbackQueryInputSchema,
    GetReportQueueQueryInputSchema,
    ResolveReportsMutationInputSchema,
    UnbanUserMutationInputSchema,
    UpdateFeedbackStatusMutationInputSchema,
    WarnUserMutationInputSchema,
    warnUserMutation,
    banUserMutation,
    getFeedbackQuery,
    getReportQueueQuery,
    resolveReportsMutation,
    unbanUserMutation,
    updateFeedbackStatusMutation,
} from "@myapp/shared/domains";

import {
    banUser,
    deleteChatMessage,
    deletePost,
    deletePostComment,
    getFeedbackItems,
    getModerationSubject,
    getPostMediaByPostId,
    getReportedItem,
    getReportedItems,
    resolveReports,
    unbanUser,
    updateUserFeedbackStatus,
    warnUser,
} from "../../../data-access";
import { storage } from "../../../storage";
import { errorReporter, reportingFailures } from "../../../observability";
import { procedure, router } from "../trpc";

/** Admin-only: the report queue and what to do about it, bans, and feedback (see canAdminister). */
export const adminRouter = router({
    getReportQueue: procedure.input(GetReportQueueQueryInputSchema).query(({ ctx, input }) =>
        getReportQueueQuery({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getReportedItems },
        }),
    ),

    resolveReports: procedure.input(ResolveReportsMutationInputSchema).mutation(({ ctx, input }) =>
        resolveReportsMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: {
                getCallingUser: ctx.getCallingUser,
                getReportedItem,
                getPostMediaByPostId,
                deletePost,
                // A removed post's photo whose file wasn't deleted is still public: report it (the removal still succeeds).
                deleteMedia: reportingFailures({ reporter: errorReporter, context: { ...ctx.errorReportContext, procedure: "admin.resolveReports" }, run: storage.deleteMedia }),
                deletePostComment,
                deleteChatMessage,
                resolveReports,
            },
        }),
    ),

    banUser: procedure.input(BanUserMutationInputSchema).mutation(({ ctx, input }) =>
        banUserMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getModerationSubject, banUser },
        }),
    ),

    warnUser: procedure.input(WarnUserMutationInputSchema).mutation(({ ctx, input }) =>
        warnUserMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getModerationSubject, warnUser },
        }),
    ),

    unbanUser: procedure.input(UnbanUserMutationInputSchema).mutation(({ ctx, input }) =>
        unbanUserMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getModerationSubject, unbanUser },
        }),
    ),

    getFeedback: procedure.input(GetFeedbackQueryInputSchema).query(({ ctx, input }) =>
        getFeedbackQuery({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getFeedbackItems },
        }),
    ),

    updateFeedbackStatus: procedure.input(UpdateFeedbackStatusMutationInputSchema).mutation(({ ctx, input }) =>
        updateFeedbackStatusMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, updateUserFeedbackStatus },
        }),
    ),
});

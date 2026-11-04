import { CreateUserFeedbackMutationInputSchema, createUserFeedbackMutation } from "@myapp/shared/domains";

import { createUserFeedback } from "../../../data-access";
import { procedure, router } from "../trpc";

export const feedbackRouter = router({
    submitFeedback: procedure.input(CreateUserFeedbackMutationInputSchema).mutation(({ ctx, input }) =>
        createUserFeedbackMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: {
                getCallingUser: ctx.getCallingUser,
                getUserAgent: () => ctx.reqHeaders.get("user-agent"),
                createUserFeedback,
            },
        }),
    ),
});

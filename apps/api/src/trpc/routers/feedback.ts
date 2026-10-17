import { z } from "zod";

import { schema, submitFeedback } from "../../data-access";
import { requireUserAndProfile } from "../context";
import { procedure, router } from "../trpc";

export const feedbackRouter = router({
    /**
     * Sends feedback from the app. `pageUrl` is where it was sent from; the
     * user agent is taken from the request.
     */
    submitFeedback: procedure
        .input(
            z.object({
                category: z.enum(schema.feedbackCategories),
                message: z.string().trim().min(1).max(2000),
                pageUrl: z.string().trim().max(500).nullish().transform((v) => v || null),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const { user } = await requireUserAndProfile(ctx);
            return submitFeedback(ctx.db, {
                userId: user.id,
                ...input,
                userAgent: ctx.reqHeaders.get("user-agent")?.slice(0, 500) ?? null,
            });
        }),
});

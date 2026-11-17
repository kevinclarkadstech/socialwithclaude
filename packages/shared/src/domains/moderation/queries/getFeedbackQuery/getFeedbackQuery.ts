import z from "zod";
import type { Query } from "../../../../types/query";
import { succeed } from "../../../../utils/result";
import { PageInputSchema, type Page } from "../../../../types/page";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../../users/types/calling-user";
import { UserFeedbackStatusSchema, type UserFeedbackStatus } from "../../../users/types/user-feedback";
import { canModerate } from "../../authorization/canModerate/canModerate";
import { FeedbackItemSchema, type FeedbackItem } from "../../types/feedback-item";

export const GetFeedbackQueryInputSchema = PageInputSchema.extend({
    // Only feedback with this status; every status if not given.
    status: UserFeedbackStatusSchema.nullish(),
});

export type GetFeedbackQueryInput = z.infer<typeof GetFeedbackQueryInputSchema>;

export const GetFeedbackQueryOutputSchema = z.object({
    items: z.array(FeedbackItemSchema),
    nextCursor: z.string().nullable(),
});

export type GetFeedbackQueryOutput = z.infer<typeof GetFeedbackQueryOutputSchema>;

/** Feedback people sent from the app, newest first. Admins only. */
export const getFeedbackQuery: Query<{ input: GetFeedbackQueryInput, output: GetFeedbackQueryOutput }, {
    getCallingUser: GetCallingUser;
    getFeedbackItems: (args: { status: UserFeedbackStatus | null; cursor: string | null; limit: number }) => Promise<Page<FeedbackItem>>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = canModerate({ caller });
    if (!allowed.ok) {
        logDisallowedResult({ logger, result: allowed, details: { action: "get-feedback", callerId: caller?.userId } });
        return allowed;
    }

    const page = await dependencies.getFeedbackItems({ status: input.status ?? null, cursor: input.cursor ?? null, limit: input.limit });
    return succeed(page);
};

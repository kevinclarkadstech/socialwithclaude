import z from "zod";
import type { Query } from "../../../../types/query";
import { succeed } from "../../../../utils/result";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../../users/types/calling-user";
import { canModerate } from "../../authorization/canModerate/canModerate";
import { ReportedItemSchema, type ReportedItem } from "../../types/reported-item";

export const GetReportQueueQueryInputSchema = z.object({
    // "open": waiting for a moderator, longest-waiting first. "resolved": settled, most recent first.
    status: z.enum(["open", "resolved"]).default("open"),
    limit: z.int().min(1).max(100).default(50),
});

export type GetReportQueueQueryInput = z.infer<typeof GetReportQueueQueryInputSchema>;

export const GetReportQueueQueryOutputSchema = z.array(ReportedItemSchema);

export type GetReportQueueQueryOutput = z.infer<typeof GetReportQueueQueryOutputSchema>;

/** The moderation queue: one item per reported thing, with every report about it. Admins only. */
export const getReportQueueQuery: Query<{ input: GetReportQueueQueryInput, output: GetReportQueueQueryOutput }, {
    getCallingUser: GetCallingUser;
    getReportedItems: (args: { status: "open" | "resolved"; limit: number }) => Promise<ReportedItem[]>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = canModerate({ caller });
    if (!allowed.ok) {
        logDisallowedResult({ logger, result: allowed, details: { action: "get-report-queue", callerId: caller?.userId } });
        return allowed;
    }

    const items = await dependencies.getReportedItems(input);
    return succeed(items);
};

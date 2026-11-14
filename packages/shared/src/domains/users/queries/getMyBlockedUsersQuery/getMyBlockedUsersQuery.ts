import z from "zod";
import type { Query } from "../../../../types/query";
import { succeed } from "../../../../utils/result";
import { PageInputSchema, type Page } from "../../../../types/page";
import { requireCallerWithProfile } from "../../../../authorization/requireCaller/requireCaller";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../types/calling-user";
import { UserBlockViewSchema, type UserBlockView } from "../../types/user-block";

export const GetMyBlockedUsersQueryInputSchema = PageInputSchema;

export type GetMyBlockedUsersQueryInput = z.infer<typeof GetMyBlockedUsersQueryInputSchema>;

export const GetMyBlockedUsersQueryOutputSchema = z.object({
    items: z.array(UserBlockViewSchema),
    nextCursor: z.string().nullable(),
});

export type GetMyBlockedUsersQueryOutput = z.infer<typeof GetMyBlockedUsersQueryOutputSchema>;

/** Users the caller has blocked, most recent first, each with who they are. */
export const getMyBlockedUsersQuery: Query<{ input: GetMyBlockedUsersQueryInput, output: GetMyBlockedUsersQueryOutput }, {
    getCallingUser: GetCallingUser;
    getUserBlockViews: (args: { userId: string; cursor?: string | null; limit: number }) => Promise<Page<UserBlockView>>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = requireCallerWithProfile({ caller });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "get-my-blocked-users", callerId: caller?.userId },
        });
        return allowed;
    }

    const page = await dependencies.getUserBlockViews({ ...input, userId: allowed.value.userId });
    return succeed(page);
}

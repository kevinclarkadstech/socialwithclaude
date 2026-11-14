import z from "zod";
import type { Query } from "../../../../types/query";
import { succeed } from "../../../../utils/result";
import { PageInputSchema, type Page } from "../../../../types/page";
import { requireCallerWithProfile } from "../../../../authorization/requireCaller/requireCaller";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../types/calling-user";
import { UserFollowViewSchema, type UserFollowView } from "../../types/user-follow";

export const GetMyFollowRequestsQueryInputSchema = PageInputSchema;

export type GetMyFollowRequestsQueryInput = z.infer<typeof GetMyFollowRequestsQueryInputSchema>;

export const GetMyFollowRequestsQueryOutputSchema = z.object({
    items: z.array(UserFollowViewSchema),
    nextCursor: z.string().nullable(),
});

export type GetMyFollowRequestsQueryOutput = z.infer<typeof GetMyFollowRequestsQueryOutputSchema>;

/** Pending requests to follow the caller, newest first, each with who's asking. */
export const getMyFollowRequestsQuery: Query<{ input: GetMyFollowRequestsQueryInput, output: GetMyFollowRequestsQueryOutput }, {
    getCallingUser: GetCallingUser;
    getUserFollowRequestViews: (args: { userId: string; cursor?: string | null; limit: number }) => Promise<Page<UserFollowView>>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = requireCallerWithProfile({ caller });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "get-my-follow-requests", callerId: caller?.userId },
        });
        return allowed;
    }

    const page = await dependencies.getUserFollowRequestViews({ ...input, userId: allowed.value.userId });
    return succeed(page);
}

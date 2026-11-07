import z from "zod";
import type { Query } from "../../../types/query";
import { succeed } from "../../../utils/result";
import { PageInputSchema, type Page } from "../../../common/types/page";
import { requireCallerWithProfile } from "../../../logic/authorization/requireCaller";
import { logDisallowedResult } from "../../../logic/authorization/logDisallowedResult";
import type { GetCallingUser } from "../types/calling-user";
import { UserFollowSchema, type UserFollow } from "../types/user-follow";

export const GetMyFollowRequestsQueryInputSchema = PageInputSchema;

export type GetMyFollowRequestsQueryInput = z.infer<typeof GetMyFollowRequestsQueryInputSchema>;

export const GetMyFollowRequestsQueryOutputSchema = z.object({
    items: z.array(UserFollowSchema),
    nextCursor: z.string().nullable(),
});

export type GetMyFollowRequestsQueryOutput = z.infer<typeof GetMyFollowRequestsQueryOutputSchema>;

/** Pending requests to follow the caller, newest first. */
export const getMyFollowRequestsQuery: Query<{ input: GetMyFollowRequestsQueryInput, output: GetMyFollowRequestsQueryOutput }, {
    getCallingUser: GetCallingUser;
    getUserFollowRequests: (args: { userId: string; cursor?: string | null; limit: number }) => Promise<Page<UserFollow>>;
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

    const page = await dependencies.getUserFollowRequests({ ...input, userId: allowed.value.userId });
    return succeed(page);
}

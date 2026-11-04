import z from "zod";
import type { Query } from "../../../types/query";
import { succeed } from "../../../utils/result";
import { PageInputSchema, type Page } from "../../../common/types/page";
import { requireCallerWithProfile } from "../../../logic/authorization/requireCaller";
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
}> = async ({ input, dependencies }) => {
    const allowed = requireCallerWithProfile(await dependencies.getCallingUser());
    if (!allowed.ok) return allowed;

    return succeed(await dependencies.getUserFollowRequests({ ...input, userId: allowed.value.userId }));
}

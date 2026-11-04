import z from "zod";
import type { Query } from "../../../types/query";
import { succeed } from "../../../utils/result";
import { PageInputSchema, type Page } from "../../../common/types/page";
import { requireCallerWithProfile } from "../../../logic/authorization/requireCaller";
import type { GetCallingUser } from "../types/calling-user";
import { UserBlockSchema, type UserBlock } from "../types/user-block";

export const GetMyBlockedUsersQueryInputSchema = PageInputSchema;

export type GetMyBlockedUsersQueryInput = z.infer<typeof GetMyBlockedUsersQueryInputSchema>;

export const GetMyBlockedUsersQueryOutputSchema = z.object({
    items: z.array(UserBlockSchema),
    nextCursor: z.string().nullable(),
});

export type GetMyBlockedUsersQueryOutput = z.infer<typeof GetMyBlockedUsersQueryOutputSchema>;

/** Users the caller has blocked, most recent first. */
export const getMyBlockedUsersQuery: Query<{ input: GetMyBlockedUsersQueryInput, output: GetMyBlockedUsersQueryOutput }, {
    getCallingUser: GetCallingUser;
    getUserBlocks: (args: { userId: string; cursor?: string | null; limit: number }) => Promise<Page<UserBlock>>;
}> = async ({ input, dependencies }) => {
    const allowed = requireCallerWithProfile(await dependencies.getCallingUser());
    if (!allowed.ok) return allowed;

    return succeed(await dependencies.getUserBlocks({ ...input, userId: allowed.value.userId }));
}

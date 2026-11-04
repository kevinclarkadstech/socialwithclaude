import z from "zod";
import type { Query } from "../../../types/query";
import { succeed } from "../../../utils/result";
import { PageInputSchema, type Page } from "../../../common/types/page";
import { requireCallerWithProfile } from "../../../logic/authorization/requireCaller";
import { logDisallowedResult } from "../../../logic/authorization/logDisallowedResult";
import type { GetCallingUser } from "../types/calling-user";
import { UserSaveSchema, type UserSave } from "../types/user-save";

export const GetMySavesQueryInputSchema = PageInputSchema;

export type GetMySavesQueryInput = z.infer<typeof GetMySavesQueryInputSchema>;

export const GetMySavesQueryOutputSchema = z.object({
    items: z.array(UserSaveSchema),
    nextCursor: z.string().nullable(),
});

export type GetMySavesQueryOutput = z.infer<typeof GetMySavesQueryOutputSchema>;

/** What the caller saved, most recent first. */
export const getMySavesQuery: Query<{ input: GetMySavesQueryInput, output: GetMySavesQueryOutput }, {
    getCallingUser: GetCallingUser;
    getUserSaves: (args: { userId: string; cursor?: string | null; limit: number }) => Promise<Page<UserSave>>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = requireCallerWithProfile(caller);
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "get-my-saves", callerId: caller?.userId },
        });
        return allowed;
    }

    const page = await dependencies.getUserSaves({ ...input, userId: allowed.value.userId });
    return succeed(page);
}

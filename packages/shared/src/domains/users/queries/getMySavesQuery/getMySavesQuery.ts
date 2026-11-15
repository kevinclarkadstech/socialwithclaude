import z from "zod";
import type { Query } from "../../../../types/query";
import { succeed } from "../../../../utils/result";
import { PageInputSchema, type Page } from "../../../../types/page";
import { requireCallerWithProfile } from "../../../../authorization/requireCaller/requireCaller";
import { blockedEitherWay } from "../../../../authorization/conditions/conditions";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../types/calling-user";
import { UserSaveSchema, type UserSave } from "../../types/user-save";

export const GetMySavesQueryInputSchema = PageInputSchema;

export type GetMySavesQueryInput = z.infer<typeof GetMySavesQueryInputSchema>;

export const GetMySavesQueryOutputSchema = z.object({
    items: z.array(UserSaveSchema),
    nextCursor: z.string().nullable(),
});

export type GetMySavesQueryOutput = z.infer<typeof GetMySavesQueryOutputSchema>;

/** What the caller saved, most recent first. Items by anyone blocked either way are left out while the block lasts. */
export const getMySavesQuery: Query<{ input: GetMySavesQueryInput, output: GetMySavesQueryOutput }, {
    getCallingUser: GetCallingUser;
    getUserSaves: (args: { excludedCreatorIds?: string[]; userId: string; cursor?: string | null; limit: number }) => Promise<Page<UserSave>>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = requireCallerWithProfile({ caller });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "get-my-saves", callerId: caller?.userId },
        });
        return allowed;
    }

    const page = await dependencies.getUserSaves({
        ...input,
        userId: allowed.value.userId,
        excludedCreatorIds: blockedEitherWay(allowed.value),
    });
    return succeed(page);
}

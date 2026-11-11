import z from "zod";
import type { Query } from "../../../../types/query";
import { succeed } from "../../../../utils/result";
import { PageInputSchema, type Page } from "../../../../common/types/page";
import { requireCallerWithProfile } from "../../../../common/authorization/requireCaller/requireCaller";
import { logDisallowedResult } from "../../../../common/authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../../users/types/calling-user";
import { ChatSchema, type Chat } from "../../types/chat";

export const GetMyChatsQueryInputSchema = PageInputSchema;

export type GetMyChatsQueryInput = z.infer<typeof GetMyChatsQueryInputSchema>;

export const GetMyChatsQueryOutputSchema = z.object({
    items: z.array(ChatSchema),
    nextCursor: z.string().nullable(),
});

export type GetMyChatsQueryOutput = z.infer<typeof GetMyChatsQueryOutputSchema>;

/** The caller's chats, newest first. */
export const getMyChatsQuery: Query<{ input: GetMyChatsQueryInput, output: GetMyChatsQueryOutput }, {
    getCallingUser: GetCallingUser;
    getUserChats: (args: { userId: string; cursor?: string | null; limit: number }) => Promise<Page<Chat>>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = requireCallerWithProfile({ caller });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "get-my-chats", callerId: caller?.userId },
        });
        return allowed;
    }

    const page = await dependencies.getUserChats({ ...input, userId: allowed.value.userId });
    return succeed(page);
}

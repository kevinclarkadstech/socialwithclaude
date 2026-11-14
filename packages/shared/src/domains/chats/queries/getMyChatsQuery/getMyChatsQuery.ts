import z from "zod";
import type { Query } from "../../../../types/query";
import { succeed } from "../../../../utils/result";
import { PageInputSchema, type Page } from "../../../../types/page";
import { requireCallerWithProfile } from "../../../../authorization/requireCaller/requireCaller";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../../users/types/calling-user";
import { ChatViewSchema, type ChatView } from "../../types/chat";

export const GetMyChatsQueryInputSchema = PageInputSchema;

export type GetMyChatsQueryInput = z.infer<typeof GetMyChatsQueryInputSchema>;

export const GetMyChatsQueryOutputSchema = z.object({
    items: z.array(ChatViewSchema),
    nextCursor: z.string().nullable(),
});

export type GetMyChatsQueryOutput = z.infer<typeof GetMyChatsQueryOutputSchema>;

/**
 * The caller's inbox: chats with a message they can see, the most recent
 * message first, each with who it's with and whether it's unread.
 */
export const getMyChatsQuery: Query<{ input: GetMyChatsQueryInput, output: GetMyChatsQueryOutput }, {
    getCallingUser: GetCallingUser;
    getUserChatViews: (args: { userId: string; cursor?: string | null; limit: number }) => Promise<Page<ChatView>>;
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

    const page = await dependencies.getUserChatViews({ ...input, userId: allowed.value.userId });
    return succeed(page);
}

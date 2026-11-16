import z from "zod";
import type { Query } from "../../../../types/query";
import { succeed } from "../../../../utils/result";
import { PageInputSchema, type Page } from "../../../../types/page";
import { requireCallerWithProfile } from "../../../../authorization/requireCaller/requireCaller";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../../users/types/calling-user";
import { ChatMessageSearchResultSchema, type ChatMessageSearchResult } from "../../types/chat-message-search-result";

export const SearchChatsQueryInputSchema = PageInputSchema.extend({
    query: z.string().trim().min(1).max(100),
});

export type SearchChatsQueryInput = z.infer<typeof SearchChatsQueryInputSchema>;

export const SearchChatsQueryOutputSchema = z.object({
    items: z.array(ChatMessageSearchResultSchema),
    nextCursor: z.string().nullable(),
});

export type SearchChatsQueryOutput = z.infer<typeof SearchChatsQueryOutputSchema>;

/**
 * Messages in the caller's chats whose content contains `query`, newest
 * first, each with who the chat is with. Only what the caller can still see:
 * not deleted, and not from before they cleared the chat.
 */
export const searchChatsQuery: Query<{ input: SearchChatsQueryInput, output: SearchChatsQueryOutput }, {
    getCallingUser: GetCallingUser;
    searchChatMessages: (args: { viewerId: string; query: string; cursor?: string | null; limit: number }) => Promise<Page<ChatMessageSearchResult>>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = requireCallerWithProfile({ caller });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "search-chats", callerId: caller?.userId },
        });
        return allowed;
    }

    // The resolver only looks in the caller's own chats.
    const page = await dependencies.searchChatMessages({ ...input, viewerId: allowed.value.userId });
    return succeed(page);
}

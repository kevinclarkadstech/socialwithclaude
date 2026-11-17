import type { ChatMessageView } from "@myapp/shared/domains";
import { getChatMessageViews } from "../getChatMessageViews/getChatMessageViews";

/** Up to `limit` of a chat's messages sent before `beforeId` (and after `after`, if given), newest first, as `viewerId` sees them. */
export async function getChatMessageViewsBefore({ chatId, beforeId, after, viewerId, limit }: {
    chatId: string;
    beforeId: string;
    after: string | null;
    viewerId: string;
    limit: number;
}): Promise<ChatMessageView[]> {
    const page = await getChatMessageViews({ chatId, viewerId, after, cursor: beforeId, limit });
    return page.items;
}

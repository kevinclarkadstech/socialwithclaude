import { and, inArray, isNull } from "drizzle-orm";
import type { ChatMessageView } from "@myapp/shared/domains";
import { schema } from "../../../db";
import { findChatMessageViews } from "../../../internal/chats/findChatMessageViews/findChatMessageViews";

/** The messages with these ids, as `viewerId` sees them, in no particular order. Deleted ones are left out. */
export async function getChatMessageViewsByIds({ ids, viewerId }: { ids: string[]; viewerId: string | null }): Promise<ChatMessageView[]> {
    if (ids.length === 0) {
        return [];
    }
    return findChatMessageViews({ viewerId, where: and(inArray(schema.chatMessages.id, ids), isNull(schema.chatMessages.deletedAt)) });
}

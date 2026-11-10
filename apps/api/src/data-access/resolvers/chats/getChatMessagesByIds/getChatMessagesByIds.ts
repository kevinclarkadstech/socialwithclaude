import { and, inArray, isNull } from "drizzle-orm";
import type { ChatMessage } from "@myapp/shared/domains";
import { schema } from "../../../db";
import { readChatMessages } from "../readChatMessages/readChatMessages";

/** The messages with these ids, as `viewerId` sees them, in no particular order. Deleted ones are left out. */
export async function getChatMessagesByIds({ ids, viewerId }: { ids: string[]; viewerId: string | null }): Promise<ChatMessage[]> {
    if (ids.length === 0) {
        return [];
    }
    return readChatMessages({ viewerId, where: and(inArray(schema.chatMessages.id, ids), isNull(schema.chatMessages.deletedAt)) });
}

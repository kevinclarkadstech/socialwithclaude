import { and, eq, isNull } from "drizzle-orm";
import type { ChatMessage } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toChatMessage } from "../../../mappers/chats";
import { selectChatMessages } from "../../../selects/selectChatMessages";

/** A message, as `viewerId` sees it. Null if it doesn't exist or was deleted. */
export async function getChatMessageById({ id, viewerId }: { id: string; viewerId: string | null }): Promise<ChatMessage | null> {
    const [row] = await selectChatMessages(db, viewerId)
        .where(and(eq(schema.chatMessages.id, id), isNull(schema.chatMessages.deletedAt)));
    return row ? toChatMessage(row) : null;
}

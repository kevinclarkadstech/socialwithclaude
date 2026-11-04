import { and, eq, isNull } from "drizzle-orm";
import type { ChatMessage } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toChatMessage } from "../../../mappers/chats";

/** Changes the content of a message `userId` sent. Null if they sent no such message. */
export async function updateChatMessage({ id, userId, content }: {
    id: string;
    userId: string;
    content: string;
}): Promise<ChatMessage | null> {
    const [row] = await db
        .update(schema.chatMessages)
        .set({ content, updatedBy: userId, updatedAt: new Date() })
        .where(and(
            eq(schema.chatMessages.id, id),
            eq(schema.chatMessages.createdBy, userId),
            isNull(schema.chatMessages.deletedAt),
        ))
        .returning();
    return row ? toChatMessage(row) : null;
}

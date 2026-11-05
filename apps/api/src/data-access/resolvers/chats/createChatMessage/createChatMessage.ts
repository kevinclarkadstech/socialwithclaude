import { eq } from "drizzle-orm";
import type { ChatMessage } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toChatMessage } from "../../../mappers/chats";

/**
 * Sends a message with the client's `id`, and marks the chat as having a new
 * message. Null if the id is already used.
 */
export async function createChatMessage({ id, chatId, userId, content }: {
    id: string;
    chatId: string;
    userId: string;
    content: string;
}): Promise<ChatMessage | null> {
    return db.transaction(async (tx) => {
        const [row] = await tx
            .insert(schema.chatMessages)
            .values({ id, chatId, content, createdBy: userId, updatedBy: userId })
            .onConflictDoNothing({ target: schema.chatMessages.id })
            .returning();
        if (!row) {
            return null;
        }

        await tx
            .update(schema.chats)
            .set({ lastMessageAt: row.createdAt })
            .where(eq(schema.chats.id, chatId));
        return toChatMessage(row);
    });
}

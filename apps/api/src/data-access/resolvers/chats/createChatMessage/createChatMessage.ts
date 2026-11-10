import { eq } from "drizzle-orm";
import type { ChatMessageView } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { getChatMessageViewById } from "../getChatMessageViewById/getChatMessageViewById";

/**
 * Sends a message with the client's `id`, and marks the chat as having a new
 * message. Null if the id is already used.
 */
export async function createChatMessage({ id, chatId, userId, content }: {
    id: string;
    chatId: string;
    userId: string;
    content: string;
}): Promise<ChatMessageView | null> {
    return db.transaction(async (tx) => {
        const [created] = await tx
            .insert(schema.chatMessages)
            .values({ id, chatId, content, createdBy: userId, updatedBy: userId })
            .onConflictDoNothing({ target: schema.chatMessages.id })
            .returning({ createdAt: schema.chatMessages.createdAt });
        if (!created) {
            return null;
        }

        await tx
            .update(schema.chats)
            .set({ lastMessageAt: created.createdAt })
            .where(eq(schema.chats.id, chatId));

        // Just written, so it exists.
        return (await getChatMessageViewById({ id, viewerId: userId }, tx))!;
    });
}

import { and, eq, isNull } from "drizzle-orm";
import type { ChatMessage } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { getChatMessageById } from "../getChatMessageById/getChatMessageById";

/** Changes a message's content, as `userId`. Null if it doesn't exist or was deleted. */
export async function updateChatMessage({ id, userId, content }: {
    id: string;
    userId: string;
    content: string;
}): Promise<ChatMessage | null> {
    const [updated] = await db
        .update(schema.chatMessages)
        .set({ content, updatedBy: userId, updatedAt: new Date() })
        .where(and(eq(schema.chatMessages.id, id), isNull(schema.chatMessages.deletedAt)))
        .returning({ id: schema.chatMessages.id });
    if (!updated) {
        return null;
    }

    // Just written, so it exists.
    return (await getChatMessageById({ id, viewerId: userId }))!;
}

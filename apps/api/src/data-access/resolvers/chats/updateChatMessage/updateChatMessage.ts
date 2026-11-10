import { and, eq, isNull } from "drizzle-orm";
import type { ChatMessageView } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { getChatMessageViewById } from "../getChatMessageViewById/getChatMessageViewById";

/** Changes a message's content, as `userId`. Null if it doesn't exist or was deleted. */
export async function updateChatMessage({ id, userId, content }: {
    id: string;
    userId: string;
    content: string;
}): Promise<ChatMessageView | null> {
    const [updated] = await db
        .update(schema.chatMessages)
        .set({ content, updatedBy: userId, updatedAt: new Date() })
        .where(and(eq(schema.chatMessages.id, id), isNull(schema.chatMessages.deletedAt)))
        .returning({ id: schema.chatMessages.id });
    if (!updated) {
        return null;
    }

    // Just written, so it exists.
    return (await getChatMessageViewById({ id, viewerId: userId }))!;
}

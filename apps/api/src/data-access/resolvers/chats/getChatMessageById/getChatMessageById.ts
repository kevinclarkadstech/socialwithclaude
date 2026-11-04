import { and, eq, isNull } from "drizzle-orm";
import type { ChatMessage } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toChatMessage } from "../../../mappers/chats";

/** A message, or null if it doesn't exist or was deleted. */
export async function getChatMessageById({ id }: { id: string }): Promise<ChatMessage | null> {
    const [row] = await db
        .select()
        .from(schema.chatMessages)
        .where(and(eq(schema.chatMessages.id, id), isNull(schema.chatMessages.deletedAt)));
    return row ? toChatMessage(row) : null;
}

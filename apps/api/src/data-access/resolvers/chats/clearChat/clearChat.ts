import { and, eq } from "drizzle-orm";
import type { ChatMember } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toChatMember } from "../../../mappers/chats/toChatMember/toChatMember";

/**
 * Deletes a chat for `userId` only: messages so far are hidden for them.
 * Null if they aren't in it.
 */
export async function clearChat({ chatId, userId }: { chatId: string; userId: string }): Promise<ChatMember | null> {
    const now = new Date();
    const [row] = await db
        .update(schema.chatMembers)
        .set({ clearedAt: now, lastReadAt: now })
        .where(and(eq(schema.chatMembers.chatId, chatId), eq(schema.chatMembers.userId, userId)))
        .returning();
    return row ? toChatMember(row) : null;
}

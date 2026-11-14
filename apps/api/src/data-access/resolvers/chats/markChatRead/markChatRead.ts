import { and, eq } from "drizzle-orm";
import type { ChatMember } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toChatMember } from "../../../mappers/chats/toChatMember/toChatMember";

/** Marks everything in a chat as read for `userId`. Null if they aren't in it. */
export async function markChatRead({ chatId, userId }: { chatId: string; userId: string }): Promise<ChatMember | null> {
    const [row] = await db
        .update(schema.chatMembers)
        .set({ lastReadAt: new Date() })
        .where(and(eq(schema.chatMembers.chatId, chatId), eq(schema.chatMembers.userId, userId)))
        .returning();
    return row ? toChatMember(row) : null;
}

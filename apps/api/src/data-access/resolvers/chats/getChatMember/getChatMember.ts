import { and, eq } from "drizzle-orm";
import type { ChatMember } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toChatMember } from "../../../mappers/chats";

/** `userId`'s membership of a chat, or null if they aren't in it. */
export async function getChatMember({ chatId, userId }: { chatId: string; userId: string }): Promise<ChatMember | null> {
    const [row] = await db
        .select()
        .from(schema.chatMembers)
        .where(and(eq(schema.chatMembers.chatId, chatId), eq(schema.chatMembers.userId, userId)));
    return row ? toChatMember(row) : null;
}

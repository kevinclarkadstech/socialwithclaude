import { eq } from "drizzle-orm";
import type { ChatMember } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toChatMember } from "../../../mappers/chats/toChatMember/toChatMember";

/** A chat's members; empty if the chat doesn't exist. */
export async function getChatMembers({ chatId }: { chatId: string }): Promise<ChatMember[]> {
    const rows = await db.select().from(schema.chatMembers).where(eq(schema.chatMembers.chatId, chatId));
    return rows.map(toChatMember);
}

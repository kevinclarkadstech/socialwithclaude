import { eq } from "drizzle-orm";
import type { ChatMemberView } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toChatMember } from "../../../mappers/chats/toChatMember/toChatMember";
import { isBanned } from "../../../internal/users/isBanned/isBanned";

/** A chat's members, each with whether they're banned right now; empty if the chat doesn't exist. */
export async function getChatMembers({ chatId }: { chatId: string }): Promise<ChatMemberView[]> {
    const rows = await db
        .select({ member: schema.chatMembers, isBanned: isBanned(schema.chatMembers.userId) })
        .from(schema.chatMembers)
        .where(eq(schema.chatMembers.chatId, chatId));
    return rows.map((row) => ({ ...toChatMember(row.member), isBanned: row.isBanned }));
}

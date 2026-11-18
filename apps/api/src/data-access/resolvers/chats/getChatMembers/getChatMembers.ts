import { eq } from "drizzle-orm";
import type { ChatMemberView } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toChatMember } from "../../../mappers/chats/toChatMember/toChatMember";
import { isUnavailable } from "../../../internal/users/isUnavailable/isUnavailable";

/** A chat's members, each with whether they're unavailable right now (see isUnavailable); empty if the chat doesn't exist. */
export async function getChatMembers({ chatId }: { chatId: string }): Promise<ChatMemberView[]> {
    const rows = await db
        .select({ member: schema.chatMembers, isUnavailable: isUnavailable(schema.chatMembers.userId) })
        .from(schema.chatMembers)
        .where(eq(schema.chatMembers.chatId, chatId));
    return rows.map((row) => ({ ...toChatMember(row.member), isUnavailable: row.isUnavailable }));
}

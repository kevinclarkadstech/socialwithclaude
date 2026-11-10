import type { Chat, ChatMember } from "@myapp/shared/domains";
import type { schema } from "../db";

type ChatRow = typeof schema.chats.$inferSelect;
type ChatMemberRow = typeof schema.chatMembers.$inferSelect;

export function toChat(row: ChatRow): Chat {
    return {
        id: row.id,
        receiverId: row.receiverId,
        lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
        createdBy: row.createdBy,
        updatedBy: row.updatedBy,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

export function toChatMember(row: ChatMemberRow): ChatMember {
    return {
        chatId: row.chatId,
        userId: row.userId,
        lastReadAt: row.lastReadAt?.toISOString() ?? null,
        clearedAt: row.clearedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
    };
}



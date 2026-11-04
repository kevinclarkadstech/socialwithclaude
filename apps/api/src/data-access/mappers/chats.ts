import type { Chat, ChatMember, ChatMessage } from "@myapp/shared/domains";
import type { schema } from "../db";

type ChatRow = typeof schema.chats.$inferSelect;
type ChatMemberRow = typeof schema.chatMembers.$inferSelect;
type ChatMessageRow = typeof schema.chatMessages.$inferSelect;

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

export function toChatMessage(row: ChatMessageRow): ChatMessage {
    return {
        id: row.id,
        chatId: row.chatId,
        content: row.content,
        createdBy: row.createdBy,
        updatedBy: row.updatedBy,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

import type { Chat, ChatMember, ChatMessage } from "@myapp/shared/domains";
import type { schema } from "../db";
import type { SelectedChatMessageRow } from "../selects/selectChatMessages";
import { toCreator } from "../selects/creatorFields";

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

/** A message from selectChatMessages. */
export function toChatMessage({ message, creator, savedAt }: SelectedChatMessageRow): ChatMessage {
    return {
        id: message.id,
        chatId: message.chatId,
        content: message.content,
        creator: toCreator(creator),
        viewer: { hasSaved: savedAt !== null },
        createdBy: message.createdBy,
        updatedBy: message.updatedBy,
        createdAt: message.createdAt.toISOString(),
        updatedAt: message.updatedAt.toISOString(),
    };
}

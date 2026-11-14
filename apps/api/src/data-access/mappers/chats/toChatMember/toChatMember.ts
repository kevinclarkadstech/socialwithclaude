import type { ChatMember } from "@myapp/shared/domains";

import type { ChatMemberRow } from "../../types";

export function toChatMember(row: ChatMemberRow): ChatMember {
    return {
        chatId: row.chatId,
        userId: row.userId,
        lastReadAt: row.lastReadAt?.toISOString() ?? null,
        clearedAt: row.clearedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
    };
}

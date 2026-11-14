import type { Chat } from "@myapp/shared/domains";

import type { ChatRow } from "../../types";

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

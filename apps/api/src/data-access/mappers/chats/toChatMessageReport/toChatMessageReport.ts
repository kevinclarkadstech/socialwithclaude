import type { ChatMessageReport } from "@myapp/shared/domains";

import type { ChatMessageReportRow } from "../../types";

export function toChatMessageReport(row: ChatMessageReportRow): ChatMessageReport {
    return {
        id: row.id,
        chatMessageId: row.chatMessageId,
        reason: row.reason,
        details: row.details,
        status: row.status,
        snapshot: row.snapshot,
        createdBy: row.createdBy,
        updatedBy: row.updatedBy,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

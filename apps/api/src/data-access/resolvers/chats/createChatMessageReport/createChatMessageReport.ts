import type { ChatMessageReport, ReportReason } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toChatMessageReport } from "../../../mappers/chats/toChatMessageReport/toChatMessageReport";

/**
 * Reports a chat message, keeping `snapshot` (it and the messages before it).
 * Reporting the same message again replaces the reason, details and snapshot.
 */
export async function createChatMessageReport({ id, userId, chatMessageId, reason, details, snapshot }: {
    id: string;
    userId: string;
    chatMessageId: string;
    reason: ReportReason;
    details: string | null;
    snapshot: ChatMessageReport["snapshot"];
}): Promise<ChatMessageReport> {
    const [row] = await db
        .insert(schema.chatMessageReports)
        .values({ id, chatMessageId, reason, details, snapshot, createdBy: userId, updatedBy: userId })
        .onConflictDoUpdate({
            target: [schema.chatMessageReports.createdBy, schema.chatMessageReports.chatMessageId],
            set: { reason, details, snapshot, updatedBy: userId, updatedAt: new Date() },
        })
        .returning();
    return toChatMessageReport(row!);
}

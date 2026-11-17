import { and, eq } from "drizzle-orm";
import type { ModerationActionType, ReportKind, ReportStatus } from "@myapp/shared/domains";
import { db, schema } from "../../../db";

/** The report table and its "what was reported" column, per kind. */
const reportTables = {
    post: { table: schema.postReports, targetId: schema.postReports.postId },
    postComment: { table: schema.postCommentReports, targetId: schema.postCommentReports.postCommentId },
    profile: { table: schema.profileReports, targetId: schema.profileReports.reportedUserId },
    chatMessage: { table: schema.chatMessageReports, targetId: schema.chatMessageReports.chatMessageId },
} satisfies Record<ReportKind, unknown>;

/**
 * Sets every open report about one thing to `status`, and logs what the
 * moderator did, in one transaction. How many reports it settled.
 */
export async function resolveReports({ kind, targetId, status, action, subjectUserId, moderatorId, note }: {
    kind: ReportKind;
    targetId: string;
    status: ReportStatus;
    action: ModerationActionType;
    subjectUserId: string;
    moderatorId: string;
    note: string | null;
}): Promise<number> {
    const { table, targetId: targetColumn } = reportTables[kind];
    return db.transaction(async (tx) => {
        const resolved = await tx
            .update(table)
            .set({ status, updatedBy: moderatorId, updatedAt: new Date() })
            .where(and(eq(targetColumn, targetId), eq(table.status, "open")))
            .returning({ id: table.id });
        await tx.insert(schema.moderationActions).values({ action, subjectUserId, targetKind: kind, targetId, note, createdBy: moderatorId });
        return resolved.length;
    });
}

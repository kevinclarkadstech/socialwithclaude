import { and, eq, inArray } from "drizzle-orm";
import type { ModerationActionType, ReportKind, ReportOutcome, ReportStatus } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { notificationDeliverAt } from "../../../internal/notifications/notificationDeliverAt/notificationDeliverAt";
import { notificationPushesDue } from "../../../internal/notifications/pushesDue/pushesDue";

/** The report table and its "what was reported" column, per kind. */
const reportTables = {
    post: { table: schema.postReports, targetId: schema.postReports.postId },
    postComment: { table: schema.postCommentReports, targetId: schema.postCommentReports.postCommentId },
    profile: { table: schema.profileReports, targetId: schema.profileReports.reportedUserId },
    chatMessage: { table: schema.chatMessageReports, targetId: schema.chatMessageReports.chatMessageId },
} satisfies Record<ReportKind, unknown>;

/**
 * Sets every open report about one thing to `status`, logs what the
 * moderator did, and tells each person whose report it settled how it went
 * (a "report_resolved" notification), in one transaction. How many reports it settled.
 */
export async function resolveReports({ kind, targetId, outcome, status, action, subjectUserId, moderatorId, note }: {
    kind: ReportKind;
    targetId: string;
    outcome: ReportOutcome;
    status: ReportStatus;
    action: ModerationActionType;
    subjectUserId: string;
    moderatorId: string;
    note: string | null;
}): Promise<number> {
    const { table, targetId: targetColumn } = reportTables[kind];
    const { resolvedCount, notified } = await db.transaction(async (tx) => {
        const resolved = await tx
            .update(table)
            .set({ status, updatedBy: moderatorId, updatedAt: new Date() })
            .where(and(eq(targetColumn, targetId), eq(table.status, "open")))
            .returning({ reporterId: table.createdBy });
        await tx.insert(schema.moderationActions).values({ action, subjectUserId, targetKind: kind, targetId, note, createdBy: moderatorId });
        // Only reporters who still have an account (a report outlives its reporter's).
        const reporterIds = await existingUserIds(tx, [...new Set(resolved.map((report) => report.reporterId))]);
        if (reporterIds.length > 0) {
            await tx.insert(schema.notifications).values(reporterIds.map((userId) => ({ userId, type: "report_resolved" as const, data: { kind, outcome }, deliverAt: notificationDeliverAt() })));
        }
        return { resolvedCount: resolved.length, notified: reporterIds.length > 0 };
    });
    if (notified) {
        await notificationPushesDue();
    }
    return resolvedCount;
}

async function existingUserIds(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) {
        return [];
    }
    const rows = await tx.select({ id: schema.users.id }).from(schema.users).where(inArray(schema.users.id, userIds));
    return rows.map(({ id }) => id);
}

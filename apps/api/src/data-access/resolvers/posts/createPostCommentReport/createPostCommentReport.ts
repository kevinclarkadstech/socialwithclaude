import { and, eq, isNull } from "drizzle-orm";
import type { PostCommentReport, ReportReason } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toPostComment, toPostCommentReport } from "../../../mappers/posts";

/**
 * Reports a comment, keeping a snapshot of it as it is now. Reporting the
 * same comment again replaces the reason, details and snapshot. Null if the
 * comment doesn't exist or was deleted.
 */
export async function createPostCommentReport({ id, userId, postCommentId, reason, details }: {
    id: string;
    userId: string;
    postCommentId: string;
    reason: ReportReason;
    details: string | null;
}): Promise<PostCommentReport | null> {
    const [comment] = await db
        .select()
        .from(schema.postComments)
        .where(and(eq(schema.postComments.id, postCommentId), isNull(schema.postComments.deletedAt)));
    if (!comment) return null;

    const snapshot = toPostComment(comment);
    const [row] = await db
        .insert(schema.postCommentReports)
        .values({ id, postCommentId, reason, details, snapshot, createdBy: userId, updatedBy: userId })
        .onConflictDoUpdate({
            target: [schema.postCommentReports.createdBy, schema.postCommentReports.postCommentId],
            set: { reason, details, snapshot, updatedBy: userId, updatedAt: new Date() },
        })
        .returning();
    return toPostCommentReport(row!);
}

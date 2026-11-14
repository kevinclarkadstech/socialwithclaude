import type { PostCommentView, PostCommentReport, ReportReason } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toPostCommentReport } from "../../../mappers/posts/toPostCommentReport/toPostCommentReport";

/**
 * Reports a comment, keeping `snapshot` (the comment as it is now).
 * Reporting the same comment again replaces the reason, details and snapshot.
 */
export async function createPostCommentReport({ id, userId, postCommentId, reason, details, snapshot }: {
    id: string;
    userId: string;
    postCommentId: string;
    reason: ReportReason;
    details: string | null;
    snapshot: Omit<PostCommentView, "viewer">;
}): Promise<PostCommentReport> {
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

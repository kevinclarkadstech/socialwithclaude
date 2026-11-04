import type { PostReport, ReportReason } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toPostReport } from "../../../mappers/posts";
import { getPostById } from "../getPostById/getPostById";

/**
 * Reports a post, keeping a snapshot of it as it is now. Reporting the same
 * post again replaces the reason, details and snapshot. Null if the post
 * doesn't exist or was deleted.
 */
export async function createPostReport({ id, userId, postId, reason, details }: {
    id: string;
    userId: string;
    postId: string;
    reason: ReportReason;
    details: string | null;
}): Promise<PostReport | null> {
    const snapshot = await getPostById({ id: postId });
    if (!snapshot) return null;

    const [row] = await db
        .insert(schema.postReports)
        .values({ id, postId, reason, details, snapshot, createdBy: userId, updatedBy: userId })
        .onConflictDoUpdate({
            target: [schema.postReports.createdBy, schema.postReports.postId],
            set: { reason, details, snapshot, updatedBy: userId, updatedAt: new Date() },
        })
        .returning();
    return toPostReport(row!);
}

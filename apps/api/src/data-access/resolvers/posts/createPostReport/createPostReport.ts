import type { PostView, PostReport, ReportReason } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toPostReport } from "../../../mappers/posts/toPostReport/toPostReport";

/**
 * Reports a post, keeping `snapshot` (the post as it is now). Reporting the
 * same post again replaces the reason, details and snapshot.
 */
export async function createPostReport({ id, userId, postId, reason, details, snapshot }: {
    id: string;
    userId: string;
    postId: string;
    reason: ReportReason;
    details: string | null;
    snapshot: Omit<PostView, "viewer">;
}): Promise<PostReport> {
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

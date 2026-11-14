import type { PostCommentReport } from "@myapp/shared/domains";

import type { PostCommentReportRow } from "../../types";

export function toPostCommentReport(row: PostCommentReportRow): PostCommentReport {
    return {
        id: row.id,
        postCommentId: row.postCommentId,
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

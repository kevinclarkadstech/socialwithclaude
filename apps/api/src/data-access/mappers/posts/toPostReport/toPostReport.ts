import type { PostReport } from "@myapp/shared/domains";

import type { PostReportRow } from "../../types";

export function toPostReport(row: PostReportRow): PostReport {
    return {
        id: row.id,
        postId: row.postId,
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

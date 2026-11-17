import type { ProfileReport } from "@myapp/shared/domains";

import type { ProfileReportRow } from "../../types";

export function toProfileReport(row: ProfileReportRow): ProfileReport {
    return {
        id: row.id,
        reportedUserId: row.reportedUserId,
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

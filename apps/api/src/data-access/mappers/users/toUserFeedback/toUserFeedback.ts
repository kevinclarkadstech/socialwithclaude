import type { UserFeedback } from "@myapp/shared/domains";

import type { UserFeedbackRow } from "../../types";

export function toUserFeedback(row: UserFeedbackRow): UserFeedback {
    return {
        id: row.id,
        userId: row.userId,
        category: row.category,
        message: row.message,
        pageUrl: row.pageUrl,
        userAgent: row.userAgent,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

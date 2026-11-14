import type { UserSession } from "@myapp/shared/domains";

import type { SessionRow } from "../../types";

export function toUserSession(row: SessionRow): UserSession {
    return {
        id: row.id,
        userId: row.userId,
        token: row.token,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        expiresAt: row.expiresAt.toISOString(),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

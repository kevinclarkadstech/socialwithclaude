import type { UserBlock } from "@myapp/shared/domains";

import type { UserBlockRow } from "../../types";

export function toUserBlock(row: UserBlockRow): UserBlock {
    return {
        userId: row.userId,
        blockedUserId: row.blockedUserId,
        createdAt: row.createdAt.toISOString(),
    };
}

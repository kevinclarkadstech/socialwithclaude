import type { UserFollow } from "@myapp/shared/domains";

import type { UserFollowRow } from "../../types";

export function toUserFollow(row: UserFollowRow): UserFollow {
    return {
        followerId: row.followerId,
        followingId: row.followingId,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

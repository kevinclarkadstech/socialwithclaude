import { and, desc, eq, sql } from "drizzle-orm";
import type { Page } from "@myapp/shared/types";
import type { UserFollow } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toUserFollow } from "../../../mappers/users/toUserFollow/toUserFollow";
import { toPage } from "../../../utils/toPage/toPage";

/** Pending requests to follow `userId`, newest first. The cursor is the last requester's id. */
export async function getUserFollowRequests({ userId, cursor, limit }: {
    userId: string;
    cursor?: string | null;
    limit: number;
}): Promise<Page<UserFollow>> {
    const t = schema.userFollows;
    const rows = await db
        .select()
        .from(t)
        .where(and(
            eq(t.followingId, userId),
            eq(t.status, "pending"),
            cursor
                ? sql`(${t.createdAt}, ${t.followerId}) < (select created_at, follower_id from user_follows where following_id = ${userId} and follower_id = ${cursor})`
                : undefined,
        ))
        .orderBy(desc(t.createdAt), desc(t.followerId))
        .limit(limit + 1);
    return toPage(rows.map(toUserFollow), limit, (follow) => follow.followerId);
}

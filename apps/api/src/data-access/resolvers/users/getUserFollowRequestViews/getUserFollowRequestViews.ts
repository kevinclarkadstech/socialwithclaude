import { and, desc, eq, sql } from "drizzle-orm";
import type { Page } from "@myapp/shared/types";
import type { UserFollowView } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { creatorFields } from "../../../constants";
import { toCreator } from "../../../mappers/users/toCreator/toCreator";
import { toUserFollow } from "../../../mappers/users/toUserFollow/toUserFollow";
import { toPage } from "../../../utils/toPage/toPage";

/** Pending requests to follow `userId`, newest first, each with the requester's profile. The cursor is the last requester's id. */
export async function getUserFollowRequestViews({ userId, cursor, limit }: {
    userId: string;
    cursor?: string | null;
    limit: number;
}): Promise<Page<UserFollowView>> {
    const t = schema.userFollows;
    const rows = await db
        .select({ follow: t, follower: creatorFields })
        .from(t)
        .innerJoin(schema.userProfiles, eq(schema.userProfiles.userId, t.followerId))
        .where(and(
            eq(t.followingId, userId),
            eq(t.status, "pending"),
            cursor
                ? sql`(${t.createdAt}, ${t.followerId}) < (select created_at, follower_id from user_follows where following_id = ${userId} and follower_id = ${cursor})`
                : undefined,
        ))
        .orderBy(desc(t.createdAt), desc(t.followerId))
        .limit(limit + 1);
    const views = rows.map(({ follow, follower }) => ({ ...toUserFollow(follow), follower: toCreator(follower) }));
    return toPage(views, limit, (view) => view.followerId);
}

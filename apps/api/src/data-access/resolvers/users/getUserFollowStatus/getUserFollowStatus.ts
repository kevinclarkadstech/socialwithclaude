import { and, eq } from "drizzle-orm";
import type { UserFollowStatus } from "@myapp/shared/domains";
import { db, schema } from "../../../db";

/** The status of `followerId`'s follow of `followingId`; null if there's none. */
export async function getUserFollowStatus({ followerId, followingId }: { followerId: string; followingId: string }): Promise<UserFollowStatus | null> {
    const [row] = await db
        .select({ status: schema.userFollows.status })
        .from(schema.userFollows)
        .where(and(eq(schema.userFollows.followerId, followerId), eq(schema.userFollows.followingId, followingId)));
    return row?.status ?? null;
}

import { and, eq } from "drizzle-orm";
import type { UserFollow } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toUserFollow } from "../../../mappers/users/toUserFollow/toUserFollow";

/** Denies `followerId`'s pending request to follow `userId`. Null if there's no pending request. */
export async function denyUserFollowRequest({ userId, followerId }: {
    userId: string;
    followerId: string;
}): Promise<UserFollow | null> {
    const [row] = await db
        .update(schema.userFollows)
        .set({ status: "denied", updatedAt: new Date() })
        .where(and(
            eq(schema.userFollows.followerId, followerId),
            eq(schema.userFollows.followingId, userId),
            eq(schema.userFollows.status, "pending"),
        ))
        .returning();
    return row ? toUserFollow(row) : null;
}

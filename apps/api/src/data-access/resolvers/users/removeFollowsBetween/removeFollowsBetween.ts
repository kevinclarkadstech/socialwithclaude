import { and, eq, or } from "drizzle-orm";
import { db, schema } from "../../../db";
import { adjustFollowCounts } from "../../../internal/users/adjustFollowCounts/adjustFollowCounts";

/**
 * Deletes any follow or follow request between `userId` and `otherUserId`,
 * either way, and takes accepted ones off both follow counts. Nothing to
 * delete is fine.
 */
export async function removeFollowsBetween({ userId, otherUserId }: { userId: string; otherUserId: string }): Promise<void> {
    const f = schema.userFollows;
    await db.transaction(async (tx) => {
        const deleted = await tx
            .delete(f)
            .where(or(
                and(eq(f.followerId, userId), eq(f.followingId, otherUserId)),
                and(eq(f.followerId, otherUserId), eq(f.followingId, userId)),
            ))
            .returning({ followerId: f.followerId, followingId: f.followingId, status: f.status });
        for (const follow of deleted) {
            if (follow.status === "accepted") {
                await adjustFollowCounts(tx, follow.followerId, follow.followingId, -1);
            }
        }
    });
}

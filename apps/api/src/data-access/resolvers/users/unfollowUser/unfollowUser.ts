import { and, eq, ne } from "drizzle-orm";
import { db, schema } from "../../../db";
import { adjustFollowCounts } from "../../../internal/users/adjustFollowCounts/adjustFollowCounts";

/**
 * Unfollows a user, or cancels a follow request. A denied request stays:
 * denial is permanent, so the follower can't clear it and ask again (following
 * again returns it unchanged). False if nothing was deleted.
 */
export async function unfollowUser({ followerId, followingId }: {
    followerId: string;
    followingId: string;
}): Promise<boolean> {
    return db.transaction(async (tx) => {
        const [deleted] = await tx
            .delete(schema.userFollows)
            .where(and(
                eq(schema.userFollows.followerId, followerId),
                eq(schema.userFollows.followingId, followingId),
                ne(schema.userFollows.status, "denied"),
            ))
            .returning({ status: schema.userFollows.status });
        if (!deleted) {
            return false;
        }

        if (deleted.status === "accepted") {

            await adjustFollowCounts(tx, followerId, followingId, -1);

        }
        return true;
    });
}

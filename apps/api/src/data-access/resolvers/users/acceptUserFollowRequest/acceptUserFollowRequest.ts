import { and, eq } from "drizzle-orm";
import type { UserFollow } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toUserFollow } from "../../../mappers/users";
import { adjustFollowCounts } from "../../../follow-counts";

/** Accepts `followerId`'s pending request to follow `userId`. Null if there's no pending request. */
export async function acceptUserFollowRequest({ userId, followerId }: {
    userId: string;
    followerId: string;
}): Promise<UserFollow | null> {
    return db.transaction(async (tx) => {
        const [row] = await tx
            .update(schema.userFollows)
            .set({ status: "accepted", updatedAt: new Date() })
            .where(and(
                eq(schema.userFollows.followerId, followerId),
                eq(schema.userFollows.followingId, userId),
                eq(schema.userFollows.status, "pending"),
            ))
            .returning();
        if (!row) {
            return null;
        }

        await adjustFollowCounts(tx, followerId, userId, 1);
        return toUserFollow(row);
    });
}

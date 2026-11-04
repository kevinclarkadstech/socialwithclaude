import { and, eq } from "drizzle-orm";
import type { UserFollow, UserFollowStatus } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toUserFollow } from "../../../mappers/users";
import { adjustFollowCounts } from "../../../follow-counts";

/**
 * `followerId` follows `followingId` with `status` (accepted, or pending a
 * response). If there's already a follow (or request), returns it unchanged.
 */
export async function followUser({ followerId, followingId, status }: {
    followerId: string;
    followingId: string;
    status: Extract<UserFollowStatus, "accepted" | "pending">;
}): Promise<UserFollow> {
    return db.transaction(async (tx) => {
        const [created] = await tx
            .insert(schema.userFollows)
            .values({ followerId, followingId, status })
            .onConflictDoNothing()
            .returning();
        if (!created) {
            const [existing] = await tx
                .select()
                .from(schema.userFollows)
                .where(and(eq(schema.userFollows.followerId, followerId), eq(schema.userFollows.followingId, followingId)));
            return toUserFollow(existing!);
        }

        if (created.status === "accepted") {

            await adjustFollowCounts(tx, followerId, followingId, 1);

        }
        return toUserFollow(created);
    });
}

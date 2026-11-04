import { and, eq } from "drizzle-orm";
import type { UserFollow } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toUserFollow } from "../../../mappers/users";
import { adjustFollowCounts } from "../../../follow-counts";

/**
 * `followerId` follows `followingId`: accepted right away if their profile is
 * public, otherwise pending until they accept or deny it. If there's already
 * a follow (or request), returns it unchanged. Null if `followingId` hasn't
 * finished sign-up.
 */
export async function followUser({ followerId, followingId }: {
    followerId: string;
    followingId: string;
}): Promise<UserFollow | null> {
    return db.transaction(async (tx) => {
        const [settings] = await tx
            .select({ profileVisibility: schema.userSettings.profileVisibility })
            .from(schema.userSettings)
            .where(eq(schema.userSettings.userId, followingId));
        if (!settings) return null;

        const status = settings.profileVisibility === "public" ? "accepted" : "pending";
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

        if (created.status === "accepted") await adjustFollowCounts(tx, followerId, followingId, 1);
        return toUserFollow(created);
    });
}

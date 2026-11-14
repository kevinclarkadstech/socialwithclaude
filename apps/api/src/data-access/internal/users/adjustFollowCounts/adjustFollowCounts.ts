import { eq, sql } from "drizzle-orm";

import { type Transaction, schema } from "../../../db";

/**
 * Adds `delta` to the follower's following count and the followed user's
 * follower count, when an accepted follow starts or ends.
 */
export async function adjustFollowCounts(tx: Transaction, followerId: string, followingId: string, delta: 1 | -1) {
    await tx
        .update(schema.userProfiles)
        .set({ numFollowing: sql`${schema.userProfiles.numFollowing} + ${delta}` })
        .where(eq(schema.userProfiles.userId, followerId));
    await tx
        .update(schema.userProfiles)
        .set({ numFollowers: sql`${schema.userProfiles.numFollowers} + ${delta}` })
        .where(eq(schema.userProfiles.userId, followingId));
}

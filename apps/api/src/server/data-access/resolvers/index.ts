import { and, eq, sql } from "drizzle-orm";

import { schema, type Database } from "../db";

export async function getUserIdByUsername(db: Database, username: string) {
    const [profile] = await db
        .select({ userId: schema.profiles.userId })
        .from(schema.profiles)
        .where(sql`lower(${schema.profiles.username}) = lower(${username})`)
        .limit(1);

    return profile?.userId ?? null;
}

export async function followUser(db: Database, followerId: string, followingId: string) {
    if (followerId === followingId) {
        throw new Error("Cannot follow yourself");
    }

    await db.transaction(async (tx) => {
        const [inserted] = await tx
            .insert(schema.follows)
            .values({ followerId, followingId })
            .onConflictDoNothing()
            .returning();

        // Already following; leave counts untouched.
        if (!inserted) return;

        await tx
            .update(schema.profiles)
            .set({ numFollowing: sql`${schema.profiles.numFollowing} + 1` })
            .where(eq(schema.profiles.userId, followerId));

        await tx
            .update(schema.profiles)
            .set({ numFollowers: sql`${schema.profiles.numFollowers} + 1` })
            .where(eq(schema.profiles.userId, followingId));
    });
}

export async function unfollowUser(db: Database, followerId: string, followingId: string) {
    await db.transaction(async (tx) => {
        const deleted = await tx
            .delete(schema.follows)
            .where(
                and(
                    eq(schema.follows.followerId, followerId),
                    eq(schema.follows.followingId, followingId),
                ),
            )
            .returning();

        // Wasn't following; leave counts untouched.
        if (deleted.length === 0) return;

        await tx
            .update(schema.profiles)
            .set({ numFollowing: sql`${schema.profiles.numFollowing} - 1` })
            .where(eq(schema.profiles.userId, followerId));

        await tx
            .update(schema.profiles)
            .set({ numFollowers: sql`${schema.profiles.numFollowers} - 1` })
            .where(eq(schema.profiles.userId, followingId));
    });
}

import { and, desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { schema, type Database, type Transaction } from "../db";
import { authorFields } from "./shared";

/**
 * How a follow looks to the follower: following, requested (pending, or
 * denied: denial is silent), or none (no follow, or a denied request they
 * withdrew).
 */
export type FollowStatus = "none" | "requested" | "following";

type FollowRow = Pick<typeof schema.userFollows.$inferSelect, "status" | "withdrawn">;

function toFollowStatus(row: FollowRow | undefined): FollowStatus {
    if (!row) return "none";
    if (row.status === "accepted") return "following";
    if (row.status === "denied" && row.withdrawn) return "none";
    return "requested";
}

/** The same mapping in SQL, for a left-joined user_follows row (null when none). */
export const followStatusSql = (follows: typeof schema.userFollows) => sql<FollowStatus>`case
    when ${follows.status} is null then 'none'
    when ${follows.status} = 'accepted' then 'following'
    when ${follows.status} = 'denied' and ${follows.withdrawn} then 'none'
    else 'requested'
end`;

const isFollow = (followerId: string, followingId: string) =>
    and(eq(schema.userFollows.followerId, followerId), eq(schema.userFollows.followingId, followingId));

/** Adds `delta` to the follower's following count and the followed user's follower count. */
async function adjustFollowCounts(tx: Transaction, followerId: string, followingId: string, delta: number) {
    await tx
        .update(schema.profiles)
        .set({ numFollowing: sql`${schema.profiles.numFollowing} + ${delta}` })
        .where(eq(schema.profiles.userId, followerId));
    await tx
        .update(schema.profiles)
        .set({ numFollowers: sql`${schema.profiles.numFollowers} + ${delta}` })
        .where(eq(schema.profiles.userId, followingId));
}

/**
 * Follows a user: accepted right away if their profile is public, otherwise
 * a pending request for them to accept or deny. Following again is a no-op,
 * except that it re-sends a denied request the follower withdrew (which
 * stays denied). Returns the follow as the follower now sees it.
 */
export async function followUser(db: Database, followerId: string, followingId: string): Promise<FollowStatus> {
    if (followerId === followingId) {
        throw new Error("Cannot follow yourself");
    }

    return db.transaction(async (tx) => {
        // Lock their settings so a switch to public (which accepts pending
        // requests) can't run between reading the visibility and inserting.
        const [settings] = await tx
            .select({ profileVisibility: schema.userSettings.profileVisibility })
            .from(schema.userSettings)
            .where(eq(schema.userSettings.userId, followingId))
            .for("share");
        const status = settings?.profileVisibility === "followers" ? "pending" : "accepted";

        const [inserted] = await tx
            .insert(schema.userFollows)
            .values({ followerId, followingId, status })
            .onConflictDoNothing()
            .returning({ status: schema.userFollows.status, withdrawn: schema.userFollows.withdrawn });
        if (inserted) {
            if (inserted.status === "accepted") await adjustFollowCounts(tx, followerId, followingId, 1);
            return toFollowStatus(inserted);
        }

        const [existing] = await tx
            .update(schema.userFollows)
            .set({ withdrawn: false, updatedAt: new Date() })
            .where(and(isFollow(followerId, followingId), eq(schema.userFollows.withdrawn, true)))
            .returning({ status: schema.userFollows.status, withdrawn: schema.userFollows.withdrawn });
        if (existing) return toFollowStatus(existing);

        const [current] = await tx
            .select({ status: schema.userFollows.status, withdrawn: schema.userFollows.withdrawn })
            .from(schema.userFollows)
            .where(isFollow(followerId, followingId));
        return toFollowStatus(current);
    });
}

/**
 * Unfollows a user, or cancels a follow request. Cancelling a denied request
 * only marks it withdrawn (see userFollows). A no-op if there's nothing to
 * undo.
 */
export async function unfollowUser(db: Database, followerId: string, followingId: string) {
    await db.transaction(async (tx) => {
        const [denied] = await tx
            .update(schema.userFollows)
            .set({ withdrawn: true, updatedAt: new Date() })
            .where(and(isFollow(followerId, followingId), eq(schema.userFollows.status, "denied")))
            .returning({ status: schema.userFollows.status });
        if (!denied) await removeFollow(tx, followerId, followingId);
    });
}

/**
 * Deletes a follow (or request, whatever its status) and adjusts both counts
 * if it was accepted; a no-op if it doesn't exist. Used by blocking.
 */
export async function removeFollow(tx: Transaction, followerId: string, followingId: string) {
    const [deleted] = await tx
        .delete(schema.userFollows)
        .where(isFollow(followerId, followingId))
        .returning({ status: schema.userFollows.status });

    if (deleted?.status === "accepted") await adjustFollowCounts(tx, followerId, followingId, -1);
}

/**
 * Accepts a pending follow request to `userId` from `followerId`. Returns
 * false if there's no pending request (accepting again is a no-op that
 * returns true).
 */
export async function acceptFollowRequest(db: Database, userId: string, followerId: string) {
    return db.transaction(async (tx) => {
        const [accepted] = await tx
            .update(schema.userFollows)
            .set({ status: "accepted", updatedAt: new Date() })
            .where(and(isFollow(followerId, userId), eq(schema.userFollows.status, "pending")))
            .returning({ status: schema.userFollows.status });
        if (accepted) {
            await adjustFollowCounts(tx, followerId, userId, 1);
            return true;
        }
        return isFollowStatus(tx, followerId, userId, "accepted");
    });
}

/**
 * Denies a pending follow request to `userId` from `followerId`, silently
 * (see userFollows). Returns false if there's no pending request (denying
 * again is a no-op that returns true).
 */
export async function denyFollowRequest(db: Database, userId: string, followerId: string) {
    const [denied] = await db
        .update(schema.userFollows)
        .set({ status: "denied", updatedAt: new Date() })
        .where(and(isFollow(followerId, userId), eq(schema.userFollows.status, "pending")))
        .returning({ status: schema.userFollows.status });
    return denied ? true : isFollowStatus(db, followerId, userId, "denied");
}

async function isFollowStatus(
    db: Database | Transaction,
    followerId: string,
    followingId: string,
    status: (typeof schema.followStatuses)[number],
) {
    const [row] = await db
        .select({ status: schema.userFollows.status })
        .from(schema.userFollows)
        .where(isFollow(followerId, followingId));
    return row?.status === status;
}

/**
 * Accepts all of a user's pending follow requests (when they make their
 * profile public), adjusting every count. Call in the transaction that
 * changes the setting.
 */
export async function acceptAllFollowRequests(tx: Transaction, userId: string) {
    const accepted = await tx
        .update(schema.userFollows)
        .set({ status: "accepted", updatedAt: new Date() })
        .where(and(eq(schema.userFollows.followingId, userId), eq(schema.userFollows.status, "pending")))
        .returning({ followerId: schema.userFollows.followerId });
    if (accepted.length === 0) return;

    await tx
        .update(schema.profiles)
        .set({ numFollowers: sql`${schema.profiles.numFollowers} + ${accepted.length}` })
        .where(eq(schema.profiles.userId, userId));
    await tx
        .update(schema.profiles)
        .set({ numFollowing: sql`${schema.profiles.numFollowing} + 1` })
        .where(
            sql`${schema.profiles.userId} in (${sql.join(
                accepted.map((a) => sql`${a.followerId}`),
                sql`, `,
            )})`,
        );
}

const cursorRequest = alias(schema.userFollows, "cursor_request");

/**
 * A user's pending follow requests with the requesters' profiles, newest
 * first. The cursor is the last requester's user id: pass the previous
 * page's `nextCursor` as `cursor` to get the next page.
 */
export async function getFollowRequests(
    db: Database,
    userId: string,
    { cursor, limit }: { cursor?: string | null; limit: number },
) {
    const isPending = and(
        eq(schema.userFollows.followingId, userId),
        eq(schema.userFollows.status, "pending"),
    );
    const before = cursor
        ? sql`(${schema.userFollows.createdAt}, ${schema.userFollows.followerId}) < (${db
            .select({ createdAt: cursorRequest.createdAt, followerId: cursorRequest.followerId })
            .from(cursorRequest)
            .where(and(eq(cursorRequest.followerId, cursor), eq(cursorRequest.followingId, userId)))})`
        : undefined;

    const rows = await db
        .select({ ...authorFields, requestedAt: schema.userFollows.createdAt })
        .from(schema.userFollows)
        .innerJoin(schema.profiles, eq(schema.profiles.userId, schema.userFollows.followerId))
        .where(and(isPending, before))
        .orderBy(desc(schema.userFollows.createdAt), desc(schema.userFollows.followerId))
        .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return { items, nextCursor: hasMore ? items[items.length - 1]!.userId : null };
}

/** How many pending follow requests a user has, for a badge. */
export async function getFollowRequestCount(db: Database, userId: string) {
    const [row] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.userFollows)
        .where(and(eq(schema.userFollows.followingId, userId), eq(schema.userFollows.status, "pending")));
    return row?.count ?? 0;
}

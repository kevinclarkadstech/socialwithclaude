import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";

import { schema, type Database, type Transaction } from "../db";
import { getUniqueViolationConstraint, ProfileAlreadyExistsError, UsernameTakenError } from "../errors";
import { authorFields, startsWithPattern } from "./shared";

export async function getUserIdByUsername(db: Database, username: string) {
    const [profile] = await db
        .select({ userId: schema.profiles.userId })
        .from(schema.profiles)
        .where(sql`lower(${schema.profiles.username}) = lower(${username})`)
        .limit(1);

    return profile?.userId ?? null;
}

export async function getProfileByUserId(db: Database, userId: string) {
    const [profile] = await db
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.userId, userId))
        .limit(1);

    return profile ?? null;
}

export type Profile = NonNullable<Awaited<ReturnType<typeof getProfileByUserId>>>;

/**
 * Completes sign-up for an authenticated user: creates their profile and
 * settings in one transaction.
 *
 * @throws UsernameTakenError if the username (case-insensitive) is in use.
 * @throws ProfileAlreadyExistsError if the user already signed up.
 */
export async function signUp(
    db: Database,
    values: {
        userId: string;
        username: string;
        firstName?: string | null;
        lastName?: string | null;
        bio?: string | null;
    },
) {
    try {
        return await db.transaction(async (tx) => {
            const [profile] = await tx.insert(schema.profiles).values(values).returning();

            await tx
                .insert(schema.userSettings)
                .values({ userId: values.userId })
                .onConflictDoNothing();

            return profile!;
        });
    } catch (err) {
        switch (getUniqueViolationConstraint(err)) {
            case "profiles_username_lower_idx":
                throw new UsernameTakenError(values.username);
            case "profiles_pkey":
                throw new ProfileAlreadyExistsError(values.userId);
            default:
                throw err;
        }
    }
}

/**
 * Looks up a profile by username. When `viewerId` is given, `isFollowing`
 * reports whether the viewer follows this profile (in the same query).
 */
export async function getProfileByUsername(db: Database, username: string, viewerId: string | null) {
    const [profile] = await db
        .select({
            userId: schema.profiles.userId,
            username: schema.profiles.username,
            firstName: schema.profiles.firstName,
            lastName: schema.profiles.lastName,
            bio: schema.profiles.bio,
            avatarUrl: schema.profiles.avatarUrl,
            numFollowers: schema.profiles.numFollowers,
            numFollowing: schema.profiles.numFollowing,
            createdAt: schema.profiles.createdAt,
            isFollowing: sql<boolean>`${schema.userFollows.followerId} is not null`,
        })
        .from(schema.profiles)
        .leftJoin(
            schema.userFollows,
            viewerId
                ? and(
                    eq(schema.userFollows.followerId, viewerId),
                    eq(schema.userFollows.followingId, schema.profiles.userId),
                )
                : sql`false`,
        )
        .where(sql`lower(${schema.profiles.username}) = lower(${username})`)
        .limit(1);

    return profile ?? null;
}

/**
 * Profiles whose username, first name, last name or full name starts with
 * `query` (case-insensitive). An exact username match comes first, then the
 * most followed.
 */
export async function searchProfiles(db: Database, query: string, { limit }: { limit: number }) {
    const pattern = startsWithPattern(query);
    return db
        .select({ ...authorFields, numFollowers: schema.profiles.numFollowers })
        .from(schema.profiles)
        .where(
            or(
                ilike(schema.profiles.username, pattern),
                ilike(schema.profiles.firstName, pattern),
                ilike(schema.profiles.lastName, pattern),
                ilike(sql`concat_ws(' ', ${schema.profiles.firstName}, ${schema.profiles.lastName})`, pattern),
            ),
        )
        .orderBy(
            desc(sql`lower(${schema.profiles.username}) = lower(${query})`),
            desc(schema.profiles.numFollowers),
            asc(schema.profiles.username),
        )
        .limit(limit);
}

export async function followUser(db: Database, followerId: string, followingId: string) {
    if (followerId === followingId) {
        throw new Error("Cannot follow yourself");
    }

    await db.transaction(async (tx) => {
        const [inserted] = await tx
            .insert(schema.userFollows)
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
    await db.transaction((tx) => removeFollow(tx, followerId, followingId));
}

/** Deletes a follow and adjusts both counts; a no-op if it doesn't exist. */
export async function removeFollow(tx: Transaction, followerId: string, followingId: string) {
    const deleted = await tx
        .delete(schema.userFollows)
        .where(
            and(
                eq(schema.userFollows.followerId, followerId),
                eq(schema.userFollows.followingId, followingId),
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
}

export * from './posts';
export * from './listings';
export * from './media';
export * from './blocks';
export * from './feedback';
export * from './settings';
export * from './chats';

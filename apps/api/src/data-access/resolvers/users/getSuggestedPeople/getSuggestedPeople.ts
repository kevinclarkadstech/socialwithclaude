import { and, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import type { SuggestedPerson } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toCreator } from "../../../mappers/users/toCreator/toCreator";
import { isNotBanned } from "../../../internal/users/isNotBanned/isNotBanned";

/**
 * People for `callerId` to follow: those followed by the most people they
 * follow (accepted follows both ways along), then the most-followed public
 * accounts. Never `excludedUserIds`, anyone the caller follows or asked to,
 * or anyone banned. Signed out (null): just the most-followed public accounts.
 *
 * Cost: one pass over the caller's follows and each of theirs (the follows
 * primary key starts with follower_id). Fine at this size; if it gets slow,
 * precompute suggestions on a schedule instead.
 */
export async function getSuggestedPeople({ callerId, excludedUserIds, limit }: {
    callerId: string | null;
    excludedUserIds: string[];
    limit: number;
}): Promise<SuggestedPerson[]> {
    const follows = schema.userFollows;
    const profiles = schema.userProfiles;
    const mine = db.$with("mine").as(
        db.select({ userId: follows.followingId }).from(follows).where(and(eq(follows.followerId, callerId ?? ""), eq(follows.status, "accepted"))),
    );
    // How many of the people the caller follows follow each person.
    const followedBy = db.$with("followed_by").as(
        db
            .with(mine)
            .select({ userId: follows.followingId, count: sql<number>`count(*)::int`.as("count") })
            .from(follows)
            .where(and(inArray(follows.followerId, db.select({ userId: mine.userId }).from(mine)), eq(follows.status, "accepted")))
            .groupBy(follows.followingId),
    );
    const followedByCount = sql<number>`coalesce(${followedBy.count}, 0)`;
    const rows = await db
        .with(followedBy)
        .select({
            userId: profiles.userId,
            username: profiles.username,
            firstName: profiles.firstName,
            lastName: profiles.lastName,
            updatedAt: profiles.updatedAt,
            followedByCount,
        })
        .from(profiles)
        .leftJoin(followedBy, eq(followedBy.userId, profiles.userId))
        .leftJoin(schema.userSettings, eq(schema.userSettings.userId, profiles.userId))
        .where(and(
            sql`(${followedBy.userId} is not null or ${schema.userSettings.profileVisibility} = 'public')`,
            excludedUserIds.length ? notInArray(profiles.userId, excludedUserIds) : undefined,
            callerId
                ? sql`not exists (select 1 from ${follows} where ${follows.followerId} = ${callerId} and ${follows.followingId} = ${profiles.userId})`
                : undefined,
            isNotBanned(profiles.userId),
        ))
        .orderBy(desc(followedByCount), desc(profiles.numFollowers), profiles.userId)
        .limit(limit);
    return rows.map(({ followedByCount: count, ...person }) => ({ ...toCreator(person), followedByCount: count }));
}

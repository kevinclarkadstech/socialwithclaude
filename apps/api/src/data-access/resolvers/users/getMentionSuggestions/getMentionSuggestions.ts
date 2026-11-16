import { and, asc, desc, eq, like, notInArray, or, sql } from "drizzle-orm";
import type { UserProfileSummary } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toCreator } from "../../../mappers/users/toCreator/toCreator";

const profiles = schema.userProfiles;
const follows = schema.userFollows;

/**
 * Profiles whose username, first name or last name starts with `query`
 * (case-insensitive), leaving out `excludedUserIds`. An exact username comes
 * first, then people `callerId` follows, then their followers, then the rest
 * by username. The prefix indexes on user_profiles serve the matching.
 */
export async function getMentionSuggestions({ callerId, query, excludedUserIds, limit }: {
    callerId: string;
    query: string;
    excludedUserIds: string[];
    limit: number;
}): Promise<UserProfileSummary[]> {
    const lowered = query.toLowerCase();
    const prefix = `${lowered.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const callerFollows = sql`exists(select 1 from ${follows} where ${follows.followerId} = ${callerId} and ${follows.followingId} = ${profiles.userId} and ${follows.status} = 'accepted')`;
    const followsCaller = sql`exists(select 1 from ${follows} where ${follows.followerId} = ${profiles.userId} and ${follows.followingId} = ${callerId} and ${follows.status} = 'accepted')`;
    const rows = await db
        .select({
            userId: profiles.userId,
            username: profiles.username,
            firstName: profiles.firstName,
            lastName: profiles.lastName,
            updatedAt: profiles.updatedAt,
        })
        .from(profiles)
        .where(and(
            or(
                like(profiles.username, prefix),
                like(sql`lower(${profiles.firstName})`, prefix),
                like(sql`lower(${profiles.lastName})`, prefix),
            ),
            excludedUserIds.length ? notInArray(profiles.userId, excludedUserIds) : undefined,
        ))
        .orderBy(desc(eq(profiles.username, lowered)), desc(callerFollows), desc(followsCaller), asc(profiles.username))
        .limit(limit);
    return rows.map(toCreator);
}

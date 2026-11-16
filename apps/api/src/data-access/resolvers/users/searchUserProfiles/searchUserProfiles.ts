import { and, asc, desc, eq, like, notInArray, or, sql } from "drizzle-orm";
import type { UserProfile } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toUserProfile } from "../../../mappers/users/toUserProfile/toUserProfile";

const t = schema.userProfiles;

/** A LIKE pattern for values starting with `text`, with LIKE's wildcards escaped. */
const startsWith = (text: string) => `${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/**
 * Profiles matching the start of `query`, case-insensitive: the username,
 * first name or last name starts with it. With a space ("maya lo"), the
 * first name starts with the first word and the last name with the rest.
 * An exact username comes first, then the rest by username.
 * `excludedUserIds` are left out. The prefix indexes on user_profiles
 * serve every match, so there's no full table scan.
 */
export async function searchUserProfiles({ excludedUserIds = [], query, limit }: {
    excludedUserIds?: string[];
    query: string;
    limit: number;
}): Promise<UserProfile[]> {
    const lowered = query.trim().toLowerCase().replace(/\s+/g, " ");
    const spaceAt = lowered.indexOf(" ");
    const matches = spaceAt === -1
        ? or(
            like(t.username, startsWith(lowered)),
            like(sql`lower(${t.firstName})`, startsWith(lowered)),
            like(sql`lower(${t.lastName})`, startsWith(lowered)),
        )
        : and(
            like(sql`lower(${t.firstName})`, startsWith(lowered.slice(0, spaceAt))),
            like(sql`lower(${t.lastName})`, startsWith(lowered.slice(spaceAt + 1))),
        );
    const rows = await db
        .select()
        .from(t)
        .where(and(matches, excludedUserIds.length ? notInArray(t.userId, excludedUserIds) : undefined))
        .orderBy(desc(eq(t.username, lowered)), asc(t.username))
        .limit(limit);
    return rows.map(toUserProfile);
}

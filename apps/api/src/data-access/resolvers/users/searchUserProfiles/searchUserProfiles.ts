import { and, asc, ilike, notInArray, or } from "drizzle-orm";
import type { UserProfile } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toUserProfile } from "../../../mappers/users/toUserProfile/toUserProfile";

/**
 * Profiles whose username or name contains `query`, case-insensitive, by
 * username. `excludedUserIds` are left out.
 */
export async function searchUserProfiles({ excludedUserIds = [], query, limit }: {
    excludedUserIds?: string[];
    query: string;
    limit: number;
}): Promise<UserProfile[]> {
    const pattern = `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const t = schema.userProfiles;
    const rows = await db
        .select()
        .from(t)
        .where(and(
            or(ilike(t.username, pattern), ilike(t.firstName, pattern), ilike(t.lastName, pattern)),
            excludedUserIds.length ? notInArray(t.userId, excludedUserIds) : undefined,
        ))
        .orderBy(asc(t.username))
        .limit(limit);
    return rows.map(toUserProfile);
}

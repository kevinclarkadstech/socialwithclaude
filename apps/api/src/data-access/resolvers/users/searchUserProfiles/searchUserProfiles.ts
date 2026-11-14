import { asc, ilike, or } from "drizzle-orm";
import type { UserProfile } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toUserProfile } from "../../../mappers/users/toUserProfile/toUserProfile";

/** Profiles whose username or name contains `query`, case-insensitive, by username. */
export async function searchUserProfiles({ query, limit }: { query: string; limit: number }): Promise<UserProfile[]> {
    const pattern = `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const t = schema.userProfiles;
    const rows = await db
        .select()
        .from(t)
        .where(or(ilike(t.username, pattern), ilike(t.firstName, pattern), ilike(t.lastName, pattern)))
        .orderBy(asc(t.username))
        .limit(limit);
    return rows.map(toUserProfile);
}

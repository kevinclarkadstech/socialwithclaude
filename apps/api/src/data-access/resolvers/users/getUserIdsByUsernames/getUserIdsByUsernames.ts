import { inArray } from "drizzle-orm";
import { db, schema } from "../../../db";

/** The user ids of the people with these (lowercase) usernames, banned or not; usernames nobody has are left out. */
export async function getUserIdsByUsernames({ usernames }: { usernames: string[] }): Promise<string[]> {
    if (usernames.length === 0) {
        return [];
    }
    const rows = await db
        .select({ userId: schema.userProfiles.userId })
        .from(schema.userProfiles)
        .where(inArray(schema.userProfiles.username, usernames));
    return rows.map(({ userId }) => userId);
}

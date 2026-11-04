import { eq, sql } from "drizzle-orm";
import type { UserProfile } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toUserProfile } from "../../../mappers/users";

/** Usernames are case-insensitive. */
export async function getUserProfileByUsername({ username }: { username: string }): Promise<UserProfile | null> {
    const [row] = await db
        .select()
        .from(schema.userProfiles)
        .where(eq(sql`lower(${schema.userProfiles.username})`, username.toLowerCase()));
    return row ? toUserProfile(row) : null;
}

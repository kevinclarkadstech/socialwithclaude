import { and, eq } from "drizzle-orm";
import type { UserProfile } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toUserProfile } from "../../../mappers/users/toUserProfile/toUserProfile";
import { isNotBanned } from "../../../internal/users/isNotBanned/isNotBanned";

/** Usernames are lowercase; the input schemas lowercase what callers send. Null for a banned person (see isNotBanned). */
export async function getUserProfileByUsername({ username }: { username: string }): Promise<UserProfile | null> {
    const [row] = await db
        .select()
        .from(schema.userProfiles)
        .where(and(eq(schema.userProfiles.username, username), isNotBanned(schema.userProfiles.userId)));
    return row ? toUserProfile(row) : null;
}

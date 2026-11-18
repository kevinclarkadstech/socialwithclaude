import { and, eq } from "drizzle-orm";
import type { UserProfile } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toUserProfile } from "../../../mappers/users/toUserProfile/toUserProfile";
import { isAvailable } from "../../../internal/users/isAvailable/isAvailable";

/** Usernames are lowercase; the input schemas lowercase what callers send. Null for an unavailable person (see isAvailable). */
export async function getUserProfileByUsername({ username }: { username: string }): Promise<UserProfile | null> {
    const [row] = await db
        .select()
        .from(schema.userProfiles)
        .where(and(eq(schema.userProfiles.username, username), isAvailable(schema.userProfiles.userId)));
    return row ? toUserProfile(row) : null;
}

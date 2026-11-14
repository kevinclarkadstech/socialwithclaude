import { eq } from "drizzle-orm";
import type { UserProfile } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toUserProfile } from "../../../mappers/users/toUserProfile/toUserProfile";

/** Usernames are lowercase; the input schemas lowercase what callers send. */
export async function getUserProfileByUsername({ username }: { username: string }): Promise<UserProfile | null> {
    const [row] = await db
        .select()
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.username, username));
    return row ? toUserProfile(row) : null;
}

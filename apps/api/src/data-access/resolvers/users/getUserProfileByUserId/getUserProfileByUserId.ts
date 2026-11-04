import { eq } from "drizzle-orm";
import type { UserProfile } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toUserProfile } from "../../../mappers/users";

/** Null until the user has finished sign-up. */
export async function getUserProfileByUserId({ userId }: { userId: string }): Promise<UserProfile | null> {
    const [row] = await db.select().from(schema.userProfiles).where(eq(schema.userProfiles.userId, userId));
    return row ? toUserProfile(row) : null;
}

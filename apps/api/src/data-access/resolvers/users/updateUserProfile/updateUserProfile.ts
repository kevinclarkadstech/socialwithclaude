import { eq } from "drizzle-orm";
import type { UserProfile } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toUserProfile } from "../../../mappers/users";

/** Postgres's unique_violation: here, the username index. */
const UNIQUE_VIOLATION = "23505";

/** Saves `userId`'s username, name and about. Null if the username was taken (by someone else) meanwhile. */
export async function updateUserProfile({ userId, ...fields }: Pick<UserProfile, "userId" | "username" | "firstName" | "lastName" | "about">): Promise<UserProfile | null> {
    try {
        const [row] = await db
            .update(schema.userProfiles)
            .set({ ...fields, updatedAt: new Date() })
            .where(eq(schema.userProfiles.userId, userId))
            .returning();
        return row ? toUserProfile(row) : null;
    } catch (error) {
        const code = (error as { code?: string; cause?: { code?: string } }).code ?? (error as { cause?: { code?: string } }).cause?.code;
        if (code === UNIQUE_VIOLATION) {
            return null;
        }
        throw error;
    }
}

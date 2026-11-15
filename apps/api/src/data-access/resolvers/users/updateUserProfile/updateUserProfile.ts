import { eq } from "drizzle-orm";
import type { UserProfile } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toUserProfile } from "../../../mappers/users/toUserProfile/toUserProfile";
import { uniqueViolationConstraint } from "../../../utils/uniqueViolationConstraint/uniqueViolationConstraint";

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
        if (uniqueViolationConstraint(error) === "user_profiles_username_idx") {
            return null;
        }
        throw error;
    }
}

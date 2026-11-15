import type { UserProfile } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toUserProfile } from "../../../mappers/users/toUserProfile/toUserProfile";
import { uniqueViolationConstraint } from "../../../utils/uniqueViolationConstraint/uniqueViolationConstraint";

/**
 * Completes sign-up: creates the user's profile and default settings.
 * "username-taken" if someone took the username meanwhile; "profile-exists"
 * if the user already has a profile (e.g. sign-up submitted twice).
 */
export async function createUserProfile(
    profile: Pick<UserProfile, "userId" | "username" | "firstName" | "lastName" | "about">,
): Promise<UserProfile | "username-taken" | "profile-exists"> {
    try {
        return await db.transaction(async (tx) => {
            const [row] = await tx.insert(schema.userProfiles).values(profile).returning();
            await tx.insert(schema.userSettings).values({ userId: profile.userId });
            return toUserProfile(row!);
        });
    } catch (error) {
        const constraint = uniqueViolationConstraint(error);
        if (constraint === "user_profiles_username_idx") {
            return "username-taken";
        }
        if (constraint === "user_profiles_pkey" || constraint === "user_settings_pkey") {
            return "profile-exists";
        }
        throw error;
    }
}

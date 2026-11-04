import type { UserProfile } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toUserProfile } from "../../../mappers/users";

/** Completes sign-up: creates the user's profile and default settings. */
export async function createUserProfile(profile: Pick<UserProfile, "userId" | "username" | "firstName" | "lastName" | "about">): Promise<UserProfile> {
    return db.transaction(async (tx) => {
        const [row] = await tx.insert(schema.userProfiles).values(profile).returning();
        await tx.insert(schema.userSettings).values({ userId: profile.userId });
        return toUserProfile(row!);
    });
}

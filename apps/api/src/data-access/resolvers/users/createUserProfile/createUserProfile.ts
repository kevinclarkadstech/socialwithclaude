import { eq } from "drizzle-orm";
import type { UserProfile } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toUserProfile } from "../../../mappers/users/toUserProfile/toUserProfile";

/** Completes sign-up: creates the user's profile and default settings, and marks the user as having a profile. */
export async function createUserProfile(profile: Pick<UserProfile, "userId" | "username" | "firstName" | "lastName" | "about">): Promise<UserProfile> {
    return db.transaction(async (tx) => {
        const [row] = await tx.insert(schema.userProfiles).values(profile).returning();
        await tx.insert(schema.userSettings).values({ userId: profile.userId });
        await tx.update(schema.users).set({ hasProfile: true }).where(eq(schema.users.id, profile.userId));
        return toUserProfile(row!);
    });
}

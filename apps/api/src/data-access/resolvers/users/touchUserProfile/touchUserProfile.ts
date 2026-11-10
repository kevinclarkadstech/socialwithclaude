import { eq } from "drizzle-orm";
import type { UserProfile } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toUserProfile } from "../../../mappers/users";

/** Moves a profile's updatedAt on, e.g. when its avatar changes (it versions the photo URLs). */
export async function touchUserProfile({ userId }: { userId: string }): Promise<UserProfile> {
    const [row] = await db
        .update(schema.userProfiles)
        .set({ updatedAt: new Date() })
        .where(eq(schema.userProfiles.userId, userId))
        .returning();
    return toUserProfile(row!);
}

import { eq } from "drizzle-orm";
import type { ProfileVisibility } from "@myapp/shared/domains";
import { db, schema } from "../../../db";

/** Who can see `userId`'s posts (their settings' profileVisibility); null if they have no settings. */
export async function getProfileVisibility({ userId }: { userId: string }): Promise<ProfileVisibility | null> {
    const [row] = await db
        .select({ profileVisibility: schema.userSettings.profileVisibility })
        .from(schema.userSettings)
        .where(eq(schema.userSettings.userId, userId));
    return row?.profileVisibility ?? null;
}

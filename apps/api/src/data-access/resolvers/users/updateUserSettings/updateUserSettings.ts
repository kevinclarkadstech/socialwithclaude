import { eq } from "drizzle-orm";
import type { UserSettings } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toUserSettings } from "../../../mappers/users/toUserSettings/toUserSettings";

/** Changes only the settings given. Null until the user has finished sign-up. */
export async function updateUserSettings({ userId, ...changes }: Pick<UserSettings, "userId"> &
    Partial<Pick<UserSettings, "darkModeEnabled" | "followersCanTag" | "nonFollowersCanTag" | "profileVisibility">>,
): Promise<UserSettings | null> {
    const [row] = await db
        .update(schema.userSettings)
        .set({ ...changes, updatedAt: new Date() })
        .where(eq(schema.userSettings.userId, userId))
        .returning();
    return row ? toUserSettings(row) : null;
}

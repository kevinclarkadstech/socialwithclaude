import { eq } from "drizzle-orm";

import { schema, type Database } from "../db";

type UserSettingsRow = typeof schema.userSettings.$inferSelect;

/** The columns a user can change: every setting, without keys or timestamps. */
export type UserSettingsValues = Omit<UserSettingsRow, "userId" | "createdAt" | "updatedAt">;

/** Groups the flat settings row for the API. */
export function toUserSettingsDto(row: UserSettingsRow) {
    return {
        display: {
            darkModeEnabled: row.darkModeEnabled,
        },
        privacy: {
            followersCanTag: row.followersCanTag,
            nonFollowersCanTag: row.nonFollowersCanTag,
            profileVisibility: row.profileVisibility,
        },
        updatedAt: row.updatedAt,
    };
}

export type UserSettings = ReturnType<typeof toUserSettingsDto>;

/**
 * A user's settings. The row is created at sign-up; if it's missing anyway,
 * it's created with the defaults.
 */
export async function getUserSettings(db: Database, userId: string) {
    const [existing] = await db
        .select()
        .from(schema.userSettings)
        .where(eq(schema.userSettings.userId, userId))
        .limit(1);
    if (existing) return toUserSettingsDto(existing);

    await db.insert(schema.userSettings).values({ userId }).onConflictDoNothing();
    const [created] = await db
        .select()
        .from(schema.userSettings)
        .where(eq(schema.userSettings.userId, userId))
        .limit(1);
    return toUserSettingsDto(created!);
}

/** Changes only the given settings (creating the row if it's missing). */
export async function updateUserSettings(db: Database, userId: string, values: Partial<UserSettingsValues>) {
    if (Object.keys(values).length === 0) return;

    await db
        .insert(schema.userSettings)
        .values({ userId, ...values })
        .onConflictDoUpdate({
            target: schema.userSettings.userId,
            set: { ...values, updatedAt: new Date() },
        });
}

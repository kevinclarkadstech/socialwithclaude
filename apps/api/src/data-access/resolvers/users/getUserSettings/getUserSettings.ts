import { eq } from "drizzle-orm";
import type { UserSettings } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toUserSettings } from "../../../mappers/users/toUserSettings/toUserSettings";

/** Null until the user has finished sign-up. */
export async function getUserSettings({ userId }: { userId: string }): Promise<UserSettings | null> {
    const [row] = await db.select().from(schema.userSettings).where(eq(schema.userSettings.userId, userId));
    return row ? toUserSettings(row) : null;
}

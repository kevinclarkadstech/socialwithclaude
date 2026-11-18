import type { PushPlatform } from "@myapp/shared/domains";
import { db, schema } from "../../../db";

/** Saves a device's push token for `userId` and their session there; a token already saved (e.g. for whoever used the device before) moves to them. */
export async function savePushToken({ token, platform, userId, sessionId }: { token: string; platform: PushPlatform; userId: string; sessionId: string }): Promise<void> {
    await db
        .insert(schema.pushTokens)
        .values({ token, platform, userId, sessionId })
        .onConflictDoUpdate({ target: schema.pushTokens.token, set: { userId, sessionId, platform, updatedAt: new Date() } });
}

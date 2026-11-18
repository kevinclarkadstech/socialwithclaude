import { inArray } from "drizzle-orm";
import { db, schema } from "../../../db";

/** The push tokens of each of `userIds`' devices, by user id. */
export async function getPushTokens({ userIds }: { userIds: string[] }): Promise<Map<string, string[]>> {
    const byUser = new Map<string, string[]>();
    if (userIds.length === 0) {
        return byUser;
    }
    const rows = await db
        .select({ userId: schema.pushTokens.userId, token: schema.pushTokens.token })
        .from(schema.pushTokens)
        .where(inArray(schema.pushTokens.userId, userIds));
    for (const { userId, token } of rows) {
        byUser.set(userId, [...(byUser.get(userId) ?? []), token]);
    }
    return byUser;
}

import { inArray } from "drizzle-orm";
import { db, schema } from "../../../db";

/** Deletes push tokens Firebase said are no longer valid (the app was uninstalled, or the token replaced). */
export async function deletePushTokens({ tokens }: { tokens: string[] }): Promise<void> {
    if (tokens.length === 0) {
        return;
    }
    await db.delete(schema.pushTokens).where(inArray(schema.pushTokens.token, tokens));
}

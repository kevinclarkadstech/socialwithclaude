import { and, eq } from "drizzle-orm";
import { db, schema } from "../../../db";

/** Deletes one of `userId`'s push tokens; someone else's is left alone. */
export async function deletePushToken({ token, userId }: { token: string; userId: string }): Promise<void> {
    await db.delete(schema.pushTokens).where(and(eq(schema.pushTokens.token, token), eq(schema.pushTokens.userId, userId)));
}

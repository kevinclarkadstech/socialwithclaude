import { eq } from "drizzle-orm";
import { db, schema } from "../../../db";

/** Cancels someone's account deletion: they're available again (see isAvailable). */
export async function restoreAccount({ userId }: { userId: string }): Promise<void> {
    await db.update(schema.users).set({ deletionScheduledAt: null, updatedAt: new Date() }).where(eq(schema.users.id, userId));
}

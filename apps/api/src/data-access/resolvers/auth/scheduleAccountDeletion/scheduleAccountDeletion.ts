import { eq } from "drizzle-orm";
import { db, schema } from "../../../db";

/**
 * Marks someone's account for deletion (from `at`) and ends all their
 * sessions, so every device is signed out. Until it's restored or purged,
 * they're unavailable everywhere (see isAvailable).
 */
export async function scheduleAccountDeletion({ userId, at }: { userId: string; at: Date }): Promise<void> {
    await db.transaction(async (tx) => {
        await tx.update(schema.users).set({ deletionScheduledAt: at, updatedAt: new Date() }).where(eq(schema.users.id, userId));
        await tx.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
    });
}

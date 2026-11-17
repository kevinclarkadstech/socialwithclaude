import { eq } from "drizzle-orm";
import { db, schema } from "../../../db";

/**
 * Bans a user until `expiresAt` (for good if null), ends every session they
 * have (so they're signed out now; better-auth's admin plugin refuses new
 * ones), and logs it, in one transaction.
 */
export async function banUser({ userId, moderatorId, reason, expiresAt }: {
    userId: string;
    moderatorId: string;
    reason: string | null;
    expiresAt: Date | null;
}): Promise<void> {
    await db.transaction(async (tx) => {
        await tx
            .update(schema.users)
            .set({ banned: true, banReason: reason, banExpires: expiresAt, updatedAt: new Date() })
            .where(eq(schema.users.id, userId));
        await tx.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
        const note = expiresAt ? `${reason ?? "No reason given"} (until ${expiresAt.toISOString()})` : reason;
        await tx.insert(schema.moderationActions).values({ action: "ban_user", subjectUserId: userId, note, createdBy: moderatorId });
    });
}

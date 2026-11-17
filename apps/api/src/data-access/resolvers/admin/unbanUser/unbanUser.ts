import { eq } from "drizzle-orm";
import { db, schema } from "../../../db";

/** Lifts a user's ban and logs it, in one transaction. */
export async function unbanUser({ userId, moderatorId }: { userId: string; moderatorId: string }): Promise<void> {
    await db.transaction(async (tx) => {
        await tx
            .update(schema.users)
            .set({ banned: false, banReason: null, banExpires: null, updatedAt: new Date() })
            .where(eq(schema.users.id, userId));
        await tx.insert(schema.moderationActions).values({ action: "unban_user", subjectUserId: userId, note: null, createdBy: moderatorId });
    });
}

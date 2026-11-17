import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "../../../db";

/** Marks all of `userId`'s unread notifications read. How many it marked. */
export async function markNotificationsRead({ userId }: { userId: string }): Promise<number> {
    const t = schema.notifications;
    const rows = await db
        .update(t)
        .set({ readAt: new Date() })
        .where(and(eq(t.userId, userId), isNull(t.readAt)))
        .returning({ id: t.id });
    return rows.length;
}

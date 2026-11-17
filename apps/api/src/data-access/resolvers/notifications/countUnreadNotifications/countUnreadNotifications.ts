import { and, count, eq, isNull } from "drizzle-orm";
import { db, schema } from "../../../db";

/** How many of `userId`'s notifications they haven't seen. */
export async function countUnreadNotifications({ userId }: { userId: string }): Promise<number> {
    const t = schema.notifications;
    const [row] = await db.select({ unread: count() }).from(t).where(and(eq(t.userId, userId), isNull(t.readAt)));
    return row?.unread ?? 0;
}

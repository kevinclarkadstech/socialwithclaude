import { and, count, isNull } from "drizzle-orm";
import { db, schema } from "../../../db";
import { visibleNotifications } from "../../../internal/notifications/visibleNotifications/visibleNotifications";

/** How many of `userId`'s notifications they haven't seen, of those the list would show. */
export async function countUnreadNotifications({ userId, excludedActorIds }: { userId: string; excludedActorIds: string[] }): Promise<number> {
    const t = schema.notifications;
    const [row] = await db.select({ unread: count() }).from(t).where(and(visibleNotifications({ userId, excludedActorIds }), isNull(t.readAt)));
    return row?.unread ?? 0;
}

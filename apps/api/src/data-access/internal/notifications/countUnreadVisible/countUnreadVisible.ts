import { and, isNull, sql } from "drizzle-orm";
import { db, schema } from "../../../db";
import { visibleNotifications } from "../visibleNotifications/visibleNotifications";

/**
 * The number on `userId`'s bell (their unread notifications the list would
 * show), for a push's badge.
 * Private to these resolvers: everything else goes through the resolvers.
 */
export async function countUnreadVisible({ userId, excludedActorIds }: { userId: string; excludedActorIds: string[] }): Promise<number> {
    const n = schema.notifications;
    const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(n).where(and(visibleNotifications({ userId, excludedActorIds }), isNull(n.readAt)));
    return row?.count ?? 0;
}

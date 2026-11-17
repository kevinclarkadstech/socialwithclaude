import { and, eq, gt } from "drizzle-orm";
import type { NewNotification, NotificationType } from "@myapp/shared/domains";
import { db, schema } from "../../../db";

/** Follow notifications aren't repeated within this long (following, unfollowing and following again). */
const repeatWindowMs = 24 * 60 * 60 * 1000;
const followTypes = new Set<NotificationType>(["followed", "follow_requested", "follow_accepted"]);

/**
 * Saves notifications to send. Skips one to the person who did it, and a
 * follow notification already sent by the same person, of the same type,
 * within the last day.
 */
export async function createNotifications(notifications: NewNotification[]): Promise<void> {
    const toSend = notifications.filter((notification) => notification.userId !== notification.actorId);
    if (toSend.length === 0) {
        return;
    }
    await db.transaction(async (tx) => {
        for (const notification of toSend) {
            if (followTypes.has(notification.type) && notification.actorId) {
                const t = schema.notifications;
                const [recent] = await tx
                    .select({ id: t.id })
                    .from(t)
                    .where(and(
                        eq(t.userId, notification.userId),
                        eq(t.actorId, notification.actorId),
                        eq(t.type, notification.type),
                        gt(t.createdAt, new Date(Date.now() - repeatWindowMs)),
                    ))
                    .limit(1);
                if (recent) {
                    continue;
                }
            }
            await tx.insert(schema.notifications).values({ userId: notification.userId, actorId: notification.actorId, type: notification.type, data: notification.data });
        }
    });
}

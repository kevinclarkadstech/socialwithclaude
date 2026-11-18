import { and, inArray, sql } from "drizzle-orm";
import type { NotificationView, UserSettings } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { findNotificationViews } from "../../../internal/notifications/findNotificationViews/findNotificationViews";
import { visibleNotifications } from "../../../internal/notifications/visibleNotifications/visibleNotifications";
import { findBlockedEitherWay } from "../../../internal/users/findBlockedEitherWay/findBlockedEitherWay";
import { countUnreadVisible } from "../../../internal/notifications/countUnreadVisible/countUnreadVisible";

type PushSettings = Pick<UserSettings, "pushMessages" | "pushComments" | "pushMentions" | "pushFollows">;

/** A notification to push, with what deciding whether to (the recipient's settings) and the number on their badge takes. */
export interface NotificationToPush {
    userId: string;
    notification: NotificationView;
    settings: PushSettings;
    unreadCount: number;
}

/**
 * Takes up to `limit` notifications that are due (their delivery time has
 * come) and haven't been handled for push, and marks them handled, in one
 * go: rows another instance is taking at the same moment are skipped, so
 * each is pushed once. Returns the ones still worth pushing: those the
 * recipient would still see (see visibleNotifications: nothing since
 * undone, nothing across a block), with their settings and unread count.
 */
export async function claimNotificationPushes({ limit }: { limit: number }): Promise<NotificationToPush[]> {
    const n = schema.notifications;
    const claimed = await db.execute<{ id: string; user_id: string }>(sql`
        with due as (
            select id from ${n}
            where pushed_at is null and deliver_at <= now()
            order by deliver_at
            limit ${limit}
            for update skip locked
        )
        update ${n} set pushed_at = now() from due where ${n.id} = due.id
        returning ${n.id} as id, ${n.userId} as user_id`);
    const idsByUser = new Map<string, string[]>();
    for (const row of claimed.rows) {
        idsByUser.set(row.user_id, [...(idsByUser.get(row.user_id) ?? []), row.id]);
    }

    const toPush: NotificationToPush[] = [];
    for (const [userId, ids] of idsByUser) {
        const excludedActorIds = await findBlockedEitherWay(userId);
        const views = await findNotificationViews({ where: and(visibleNotifications({ userId, excludedActorIds }), inArray(n.id, ids))!, limit: ids.length });
        if (views.length === 0) {
            continue;
        }
        const [settings] = await db
            .select({
                pushMessages: schema.userSettings.pushMessages,
                pushComments: schema.userSettings.pushComments,
                pushMentions: schema.userSettings.pushMentions,
                pushFollows: schema.userSettings.pushFollows,
            })
            .from(schema.userSettings)
            .where(sql`${schema.userSettings.userId} = ${userId}`);
        const unreadCount = await countUnreadVisible({ userId, excludedActorIds });
        for (const notification of views) {
            toPush.push({
                userId,
                notification,
                settings: settings ?? { pushMessages: true, pushComments: true, pushMentions: true, pushFollows: true },
                unreadCount,
            });
        }
    }
    return toPush;
}

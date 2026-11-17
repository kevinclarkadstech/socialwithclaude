import { and, desc, eq, sql } from "drizzle-orm";
import type { Page } from "@myapp/shared/types";
import type { NotificationView } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { creatorFields } from "../../../constants";
import { toCreator } from "../../../mappers/users/toCreator/toCreator";
import { toNotification } from "../../../mappers/notifications/toNotification/toNotification";
import { visibleNotifications } from "../../../internal/notifications/visibleNotifications/visibleNotifications";
import { toPage } from "../../../utils/toPage/toPage";

/** `userId`'s notifications that still make sense to show (see visibleNotifications), newest first, with who did each. */
export async function getUserNotifications({ userId, excludedActorIds, cursor, limit }: {
    userId: string;
    excludedActorIds: string[];
    cursor: string | null;
    limit: number;
}): Promise<Page<NotificationView>> {
    const t = schema.notifications;
    const rows = await db
        .select({ notification: t, actor: creatorFields })
        .from(t)
        .leftJoin(schema.userProfiles, eq(schema.userProfiles.userId, t.actorId))
        .where(and(
            visibleNotifications({ userId, excludedActorIds }),
            cursor ? sql`(${t.createdAt}, ${t.id}) < (select created_at, id from notifications where id = ${cursor})` : undefined,
        ))
        .orderBy(desc(t.createdAt), desc(t.id))
        .limit(limit + 1);
    const items = rows.map((row) => ({ ...toNotification(row.notification), actor: row.actor ? toCreator(row.actor) : null }));
    return toPage(items, limit, (item) => item.id);
}

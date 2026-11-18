import { and, sql } from "drizzle-orm";
import { schema } from "../../../db";
import type { Page } from "@myapp/shared/types";
import type { NotificationView } from "@myapp/shared/domains";
import { findNotificationViews } from "../../../internal/notifications/findNotificationViews/findNotificationViews";
import { visibleNotifications } from "../../../internal/notifications/visibleNotifications/visibleNotifications";
import { toPage } from "../../../utils/toPage/toPage";

/** `userId`'s notifications that still make sense to show (see visibleNotifications), newest first, with who did each. */
export async function getUserNotifications({ userId, excludedActorIds, cursor, limit }: {
    userId: string;
    excludedActorIds: string[];
    cursor: string | null;
    limit: number;
}): Promise<Page<NotificationView>> {
    const items = await findNotificationViews({
        where: and(
            visibleNotifications({ userId, excludedActorIds }),
            cursor ? sql`(${schema.notifications.createdAt}, ${schema.notifications.id}) < (select created_at, id from notifications where id = ${cursor})` : undefined,
        )!,
        limit: limit + 1,
    });
    return toPage(items, limit, (item) => item.id);
}

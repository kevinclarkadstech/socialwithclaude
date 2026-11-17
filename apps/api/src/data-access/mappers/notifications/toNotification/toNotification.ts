import type { Notification } from "@myapp/shared/domains";

import type { NotificationRow } from "../../types";

export function toNotification(row: NotificationRow): Notification {
    // `data` was stored for its `type` (see the notifications table).
    return {
        id: row.id,
        userId: row.userId,
        actorId: row.actorId,
        type: row.type,
        data: row.data,
        readAt: row.readAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
    } as Notification;
}

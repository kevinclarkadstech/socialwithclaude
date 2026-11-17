import { and, desc, eq, sql } from "drizzle-orm";
import type { Page } from "@myapp/shared/types";
import type { Notification } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toNotification } from "../../../mappers/notifications/toNotification/toNotification";
import { toPage } from "../../../utils/toPage/toPage";

/** `userId`'s notifications, newest first. */
export async function getUserNotifications({ userId, cursor, limit }: { userId: string; cursor: string | null; limit: number }): Promise<Page<Notification>> {
    const t = schema.notifications;
    const rows = await db
        .select()
        .from(t)
        .where(and(
            eq(t.userId, userId),
            cursor ? sql`(${t.createdAt}, ${t.id}) < (select created_at, id from notifications where id = ${cursor})` : undefined,
        ))
        .orderBy(desc(t.createdAt), desc(t.id))
        .limit(limit + 1);
    return toPage(rows.map(toNotification), limit, (item) => item.id);
}

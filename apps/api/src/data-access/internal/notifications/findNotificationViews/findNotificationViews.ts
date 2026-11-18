import { desc, eq, sql, type SQL } from "drizzle-orm";
import type { NotificationView } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { creatorFields } from "../../../constants";
import { toCreator } from "../../../mappers/users/toCreator/toCreator";
import { toNotification } from "../../../mappers/notifications/toNotification/toNotification";
import { toPostCommentPhoto } from "../../../mappers/posts/toPostCommentPhoto/toPostCommentPhoto";

/**
 * Notifications matching `where`, newest first, as their recipient sees
 * them: with who did each, and a "commented" one's comment photo.
 * Private to these resolvers: everything else goes through the resolvers.
 */
export async function findNotificationViews({ where, limit }: { where: SQL; limit: number }): Promise<NotificationView[]> {
    const t = schema.notifications;
    const rows = await db
        .select({ notification: t, actor: creatorFields, commentPhoto: schema.postCommentPhotos })
        .from(t)
        .leftJoin(schema.userProfiles, eq(schema.userProfiles.userId, t.actorId))
        // A "commented" notification's comment photo, shown as a thumbnail.
        .leftJoin(schema.postCommentPhotos, sql`${t.type} = 'commented' and ${schema.postCommentPhotos.postCommentId} = ${t.data}->>'postCommentId'`)
        .where(where)
        .orderBy(desc(t.createdAt), desc(t.id))
        .limit(limit);
    return rows.map((row) => ({
        ...toNotification(row.notification),
        actor: row.actor ? toCreator(row.actor) : null,
        commentPhoto: row.commentPhoto ? toPostCommentPhoto(row.commentPhoto) : null,
    }));
}

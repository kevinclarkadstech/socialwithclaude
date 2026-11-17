import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "../../../db";

/**
 * Deletes the "mentioned" notifications `userIds` got for a post (when
 * `postCommentId` is null) or for a comment on it, read or not.
 */
export async function deleteMentionNotifications({ postId, postCommentId, userIds }: {
    postId: string;
    postCommentId: string | null;
    userIds: string[];
}): Promise<void> {
    if (userIds.length === 0) {
        return;
    }
    const n = schema.notifications;
    await db.delete(n).where(and(
        eq(n.type, "mentioned"),
        inArray(n.userId, userIds),
        sql`${n.data}->>'postId' = ${postId}`,
        postCommentId === null
            ? sql`${n.data}->>'postCommentId' is null`
            : sql`${n.data}->>'postCommentId' = ${postCommentId}`,
    ));
}

import { and, desc, eq, sql } from "drizzle-orm";
import type { Page } from "@myapp/shared/common";
import type { UserSave } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toPost, toPostComment } from "../../../mappers/posts";
import { toChatMessage } from "../../../mappers/chats";
import { toPage } from "../../../paging";

const s = schema.userSaves;
// The saved item's id, whichever type it is.
const targetId = sql<string>`coalesce(${s.postId}, ${s.postCommentId}, ${s.chatMessageId})`;

/**
 * What `userId` saved, most recent first, with each saved item. Deleted
 * items are left out. The cursor is the last saved item's id.
 */
export async function getUserSaves({ userId, cursor, limit }: {
    userId: string;
    cursor?: string | null;
    limit: number;
}): Promise<Page<UserSave>> {
    const rows = await db
        .select({
            save: s,
            targetId,
            post: schema.posts,
            listing: schema.postListings,
            postComment: schema.postComments,
            chatMessage: schema.chatMessages,
        })
        .from(s)
        .leftJoin(schema.posts, eq(schema.posts.id, s.postId))
        .leftJoin(schema.postListings, eq(schema.postListings.postId, s.postId))
        .leftJoin(schema.postComments, eq(schema.postComments.id, s.postCommentId))
        .leftJoin(schema.chatMessages, eq(schema.chatMessages.id, s.chatMessageId))
        .where(and(
            eq(s.userId, userId),
            sql`coalesce(${schema.posts.deletedAt}, ${schema.postComments.deletedAt}, ${schema.chatMessages.deletedAt}) is null`,
            cursor
                ? sql`(${s.createdAt}, ${targetId}) < (select created_at, coalesce(post_id, post_comment_id, chat_message_id) from user_saves where user_id = ${userId} and coalesce(post_id, post_comment_id, chat_message_id) = ${cursor})`
                : undefined,
        ))
        .orderBy(desc(s.createdAt), desc(targetId))
        .limit(limit + 1);

    const page = toPage(rows, limit, (row) => row.targetId);
    return {
        nextCursor: page.nextCursor,
        items: page.items.map((row): UserSave => {
            const fields = { userId: row.save.userId, createdAt: row.save.createdAt.toISOString() };
            if (row.post) return { ...fields, type: "post", post: toPost(row.post, row.listing) };
            if (row.postComment) return { ...fields, type: "postComment", postComment: toPostComment(row.postComment) };
            return { ...fields, type: "chatMessage", chatMessage: toChatMessage(row.chatMessage!) };
        }),
    };
}

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { Page } from "@myapp/shared/common";
import type { UserSave } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toPost, toPostComment } from "../../../mappers/posts";
import { toChatMessage } from "../../../mappers/chats";
import { toPage } from "../../../paging";
import { selectPosts } from "../../../selects/selectPosts";
import { selectPostComments } from "../../../selects/selectPostComments";
import { selectChatMessages } from "../../../selects/selectChatMessages";

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
    const saveRows = await db
        .select({ save: s, targetId })
        .from(s)
        .leftJoin(schema.posts, eq(schema.posts.id, s.postId))
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
    const page = toPage(saveRows, limit, (row) => row.targetId);

    // Load the saved items, as the saver sees them.
    const idsOf = (key: "postId" | "postCommentId" | "chatMessageId") =>
        page.items.map((row) => row.save[key]).filter((id): id is string => id !== null);
    const postIds = idsOf("postId");
    const postCommentIds = idsOf("postCommentId");
    const chatMessageIds = idsOf("chatMessageId");
    const [postRows, postCommentRows, chatMessageRows] = await Promise.all([
        postIds.length ? selectPosts(db, userId).where(inArray(schema.posts.id, postIds)) : [],
        postCommentIds.length ? selectPostComments(db, userId).where(inArray(schema.postComments.id, postCommentIds)) : [],
        chatMessageIds.length ? selectChatMessages(db, userId).where(inArray(schema.chatMessages.id, chatMessageIds)) : [],
    ]);
    const posts = new Map(postRows.map((row) => [row.post.id, toPost(row)]));
    const postComments = new Map(postCommentRows.map((row) => [row.comment.id, toPostComment(row)]));
    const chatMessages = new Map(chatMessageRows.map((row) => [row.message.id, toChatMessage(row)]));

    const items = page.items.flatMap(({ save }): UserSave[] => {
        const fields = { userId: save.userId, createdAt: save.createdAt.toISOString() };
        const post = save.postId ? posts.get(save.postId) : undefined;
        if (post) {
            return [{ ...fields, type: "post", post }];
        }
        const postComment = save.postCommentId ? postComments.get(save.postCommentId) : undefined;
        if (postComment) {
            return [{ ...fields, type: "postComment", postComment }];
        }
        const chatMessage = save.chatMessageId ? chatMessages.get(save.chatMessageId) : undefined;
        if (chatMessage) {
            return [{ ...fields, type: "chatMessage", chatMessage }];
        }
        // Deleted since the page was read.
        return [];
    });
    return { items, nextCursor: page.nextCursor };
}

import { and, desc, eq, notInArray, sql } from "drizzle-orm";
import type { Page } from "@myapp/shared/types";
import type { UserSave } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toPage } from "../../../utils/toPage/toPage";
import { getPostCommentViewsByIds } from "../../posts/getPostCommentViewsByIds/getPostCommentViewsByIds";
import { getPostViewsByIds } from "../../posts/getPostViewsByIds/getPostViewsByIds";
import { getChatMessageViewsByIds } from "../../chats/getChatMessageViewsByIds/getChatMessageViewsByIds";

const s = schema.userSaves;
// The saved item's id, whichever type it is.
const targetId = sql<string>`coalesce(${s.postId}, ${s.postCommentId}, ${s.chatMessageId})`;
// Who made the saved item, whichever type it is.
const targetCreatorId = sql<string>`coalesce(${schema.posts.createdBy}, ${schema.postComments.createdBy}, ${schema.chatMessages.createdBy})`;

/**
 * What `userId` saved, most recent first, with each saved item. Deleted
 * items, and items made by `excludedCreatorIds`, are left out. The cursor is
 * the last saved item's id.
 */
export async function getUserSaves({ excludedCreatorIds = [], userId, cursor, limit }: {
    // Creators whose items are left out. The saves stay, and show again if
    // they're no longer excluded.
    excludedCreatorIds?: string[];
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
            excludedCreatorIds.length ? notInArray(targetCreatorId, excludedCreatorIds) : undefined,
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
    const [savedPosts, savedComments, savedMessages] = await Promise.all([
        getPostViewsByIds({ ids: postIds, viewerId: userId }),
        getPostCommentViewsByIds({ ids: postCommentIds, viewerId: userId }),
        getChatMessageViewsByIds({ ids: chatMessageIds, viewerId: userId }),
    ]);
    const posts = new Map(savedPosts.map((post) => [post.id, post]));
    const postComments = new Map(savedComments.map((comment) => [comment.id, comment]));
    const chatMessages = new Map(savedMessages.map((message) => [message.id, message]));

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

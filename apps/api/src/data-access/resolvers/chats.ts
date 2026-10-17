import { and, desc, eq, gt, isNotNull, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { schema, type Database } from "../db";
import { IdConflictError } from "../errors";
import { authorFields } from "./shared";

/** The key that makes a 1:1 chat unique for a pair of users. */
const directKeyOf = (userId: string, otherUserId: string) => [userId, otherUserId].sort().join(":");

/**
 * The 1:1 chat between two users, created (with both members) if it doesn't
 * exist yet. Returns its id.
 */
export async function getOrCreateDirectChat(db: Database, userId: string, otherUserId: string) {
    if (userId === otherUserId) throw new Error("Cannot chat with yourself");
    const directKey = directKeyOf(userId, otherUserId);

    return db.transaction(async (tx) => {
        const [created] = await tx
            .insert(schema.chats)
            .values({ directKey })
            .onConflictDoNothing({ target: schema.chats.directKey })
            .returning({ id: schema.chats.id });
        if (created) {
            await tx.insert(schema.chatMembers).values([
                { chatId: created.id, userId },
                { chatId: created.id, userId: otherUserId },
            ]);
            return created.id;
        }

        const [existing] = await tx
            .select({ id: schema.chats.id })
            .from(schema.chats)
            .where(eq(schema.chats.directKey, directKey));
        return existing!.id;
    });
}

/** The ids of a chat's members; empty if the chat doesn't exist. */
export async function getChatMemberIds(db: Database, chatId: string) {
    const members = await db
        .select({ userId: schema.chatMembers.userId })
        .from(schema.chatMembers)
        .where(eq(schema.chatMembers.chatId, chatId));
    return members.map((m) => m.userId);
}

const cursorChat = alias(schema.chats, "cursor_chat");

/**
 * The user's inbox: chats with at least one message, most recent message
 * first. Each has the other member (`otherMember`), the latest message and
 * `unreadCount` (messages from others after the user last read the chat).
 * Pass the previous page's `nextCursor` as `cursor` to get the next page.
 */
export async function getChats(
    db: Database,
    userId: string,
    { cursor, limit }: { cursor?: string | null; limit: number },
) {
    const me = alias(schema.chatMembers, "me");
    const other = alias(schema.chatMembers, "other");

    const lastMessage = sql<{ id: string; senderId: string; body: string; createdAt: string }>`(
        select json_build_object(
            'id', m.id, 'senderId', m.sender_id, 'body', m.body, 'createdAt', m.created_at
        )
        from ${schema.chatMessages} m
        where m.chat_id = ${schema.chats.id}
        order by m.created_at desc, m.id desc
        limit 1
    )`;
    const unreadCount = sql<number>`(
        select count(*)::int
        from ${schema.chatMessages} m
        where m.chat_id = ${schema.chats.id}
            and m.sender_id <> ${userId}
            and m.created_at > coalesce(${me.lastReadAt}, '-infinity'::timestamp)
    )`;
    const chatsBefore = (cursor: string) => sql`(${schema.chats.lastMessageAt}, ${schema.chats.id}) < (${db
        .select({ lastMessageAt: cursorChat.lastMessageAt, id: cursorChat.id })
        .from(cursorChat)
        .where(eq(cursorChat.id, cursor))})`;

    const rows = await db
        .select({
            id: schema.chats.id,
            lastMessageAt: schema.chats.lastMessageAt,
            otherMember: authorFields,
            lastMessage,
            unreadCount,
        })
        .from(me)
        .innerJoin(schema.chats, eq(schema.chats.id, me.chatId))
        .innerJoin(other, and(eq(other.chatId, me.chatId), ne(other.userId, userId)))
        .innerJoin(schema.profiles, eq(schema.profiles.userId, other.userId))
        .where(
            and(
                eq(me.userId, userId),
                isNotNull(schema.chats.lastMessageAt),
                cursor ? chatsBefore(cursor) : undefined,
            ),
        )
        .orderBy(desc(schema.chats.lastMessageAt), desc(schema.chats.id))
        .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    return {
        items: items.map(({ lastMessage, ...chat }) => ({
            ...chat,
            // json_build_object writes the UTC timestamp without a zone.
            lastMessage: { ...lastMessage, createdAt: new Date(`${lastMessage.createdAt}Z`) },
        })),
        nextCursor: hasMore ? items[items.length - 1]!.id : null,
    };
}

const cursorMessage = alias(schema.chatMessages, "cursor_message");

/**
 * A chat's messages, newest first (by server time). Pass the previous page's
 * `nextCursor` as `cursor` to get older messages.
 */
export async function getChatMessages(
    db: Database,
    chatId: string,
    { cursor, limit }: { cursor?: string | null; limit: number },
) {
    const messagesBefore = (cursor: string) => sql`(${schema.chatMessages.createdAt}, ${schema.chatMessages.id}) < (${db
        .select({ createdAt: cursorMessage.createdAt, id: cursorMessage.id })
        .from(cursorMessage)
        .where(eq(cursorMessage.id, cursor))})`;

    const rows = await db
        .select({
            id: schema.chatMessages.id,
            senderId: schema.chatMessages.senderId,
            body: schema.chatMessages.body,
            createdAt: schema.chatMessages.createdAt,
        })
        .from(schema.chatMessages)
        .where(and(eq(schema.chatMessages.chatId, chatId), cursor ? messagesBefore(cursor) : undefined))
        .orderBy(desc(schema.chatMessages.createdAt), desc(schema.chatMessages.id))
        .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return { items, nextCursor: hasMore ? items[items.length - 1]!.id : null };
}

/**
 * Adds a message and moves the chat to the top of its members' inboxes. The
 * sender's own message counts as read. `id` is client-generated (optional).
 *
 * @throws IdConflictError if `id` is already used.
 */
export async function sendChatMessage(
    db: Database,
    values: { id?: string; chatId: string; senderId: string; body: string },
) {
    await db.transaction(async (tx) => {
        const [message] = await tx
            .insert(schema.chatMessages)
            .values(values)
            .onConflictDoNothing({ target: schema.chatMessages.id })
            .returning({ createdAt: schema.chatMessages.createdAt });
        if (!message) throw new IdConflictError(values.id!);

        await tx
            .update(schema.chats)
            .set({ lastMessageAt: message.createdAt })
            .where(eq(schema.chats.id, values.chatId));
        await tx
            .update(schema.chatMembers)
            .set({ lastReadAt: message.createdAt })
            .where(and(eq(schema.chatMembers.chatId, values.chatId), eq(schema.chatMembers.userId, values.senderId)));
    });
}

/**
 * True if this user already sent a message with `id` (a retried send).
 *
 * @throws IdConflictError if the id belongs to another message.
 */
export async function isOwnChatMessageId(db: Database, id: string, senderId: string, chatId: string) {
    const [message] = await db
        .select({ senderId: schema.chatMessages.senderId, chatId: schema.chatMessages.chatId })
        .from(schema.chatMessages)
        .where(eq(schema.chatMessages.id, id));
    if (!message) return false;
    if (message.senderId !== senderId || message.chatId !== chatId) throw new IdConflictError(id);
    return true;
}

/** Marks everything in the chat as read for this member (never moves backwards). */
export async function markChatRead(db: Database, chatId: string, userId: string) {
    await db
        .update(schema.chatMembers)
        .set({ lastReadAt: sql`greatest(${schema.chatMembers.lastReadAt}, now())` })
        .where(and(eq(schema.chatMembers.chatId, chatId), eq(schema.chatMembers.userId, userId)));
}

/**
 * Unread message counts for the user's chats that have any, with the other
 * member of each (so the API layer can leave out blocked users).
 */
export async function getUnreadChatCounts(db: Database, userId: string) {
    const other = alias(schema.chatMembers, "other");
    return db
        .select({
            chatId: schema.chatMembers.chatId,
            otherUserId: other.userId,
            count: sql<number>`count(*)::int`,
        })
        .from(schema.chatMembers)
        .innerJoin(other, and(eq(other.chatId, schema.chatMembers.chatId), ne(other.userId, userId)))
        .innerJoin(
            schema.chatMessages,
            and(
                eq(schema.chatMessages.chatId, schema.chatMembers.chatId),
                ne(schema.chatMessages.senderId, userId),
                gt(schema.chatMessages.createdAt, sql`coalesce(${schema.chatMembers.lastReadAt}, '-infinity'::timestamp)`),
            ),
        )
        .where(eq(schema.chatMembers.userId, userId))
        .groupBy(schema.chatMembers.chatId, other.userId);
}

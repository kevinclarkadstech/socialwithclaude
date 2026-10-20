import { and, desc, eq, gt, isNotNull, isNull, ne, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { schema, type Database } from "../db";
import { ChatMessageNotFoundError, IdConflictError, NotChatMessageSenderError } from "../errors";
import { authorFields } from "./shared";

const messageNotDeleted = isNull(schema.chatMessages.deletedAt);

/** The body, or null once deleted: a deleted message's text is never returned. */
const visibleBody = sql<string | null>`case when ${schema.chatMessages.deletedAt} is null then ${schema.chatMessages.body} end`;

/** When the message was last edited, or null if never (or deleted). */
const editedAt = sql<Date | null>`case
    when ${schema.chatMessages.deletedAt} is null and ${schema.chatMessages.updatedAt} > ${schema.chatMessages.createdAt}
    then ${schema.chatMessages.updatedAt}
end`.mapWith(schema.chatMessages.updatedAt);

/** Matches the 1:1 chat between two users, in either direction (uses chats_direct_pair_idx). */
const isDirectChatBetween = (userId: string, otherUserId: string) =>
    and(
        isNotNull(schema.chats.receiverId),
        sql`least(${schema.chats.createdBy}, ${schema.chats.receiverId}) = least(${userId}::text, ${otherUserId}::text)`,
        sql`greatest(${schema.chats.createdBy}, ${schema.chats.receiverId}) = greatest(${userId}::text, ${otherUserId}::text)`,
    );

/**
 * The 1:1 chat between two users, created (with both members) if it doesn't
 * exist yet, with `userId` as the one who started it. If the other user
 * already started one, that chat is returned. Returns its id.
 */
export async function getOrCreateDirectChat(db: Database, userId: string, receiverId: string) {
    if (userId === receiverId) throw new Error("Cannot chat with yourself");

    return db.transaction(async (tx) => {
        // The only unique constraint a new chat can hit is chats_direct_pair_idx.
        const [created] = await tx
            .insert(schema.chats)
            .values({ receiverId, createdBy: userId, updatedBy: userId })
            .onConflictDoNothing()
            .returning({ id: schema.chats.id });
        if (created) {
            await tx.insert(schema.chatMembers).values([
                { chatId: created.id, userId },
                { chatId: created.id, userId: receiverId },
            ]);
            return created.id;
        }

        const [existing] = await tx
            .select({ id: schema.chats.id })
            .from(schema.chats)
            .where(isDirectChatBetween(userId, receiverId));
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
 * The user's inbox: chats with a message the user hasn't deleted (see
 * clearChatForMember), most recent message first. Each has the other member (`otherMember`), who started the chat
 * (`createdBy`), the latest message (`body` null and `deleted` true if its
 * sender deleted it) and `unreadCount` (messages from others after the user
 * last read the chat, not counting deleted ones).
 * Pass the previous page's `nextCursor` as `cursor` to get the next page.
 */
export async function getChats(
    db: Database,
    userId: string,
    { cursor, limit }: { cursor?: string | null; limit: number },
) {
    const me = alias(schema.chatMembers, "me");
    const other = alias(schema.chatMembers, "other");

    const lastMessage = sql<{
        id: string;
        senderId: string;
        body: string | null;
        deleted: boolean;
        createdAt: string;
    }>`(
        select json_build_object(
            'id', m.id, 'senderId', m.created_by,
            'body', case when m.deleted_at is null then m.body end,
            'deleted', m.deleted_at is not null,
            'createdAt', m.created_at
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
            and m.created_by <> ${userId}
            and m.deleted_at is null
            and m.created_at > coalesce(${me.lastReadAt}, '-infinity'::timestamp)
    )`;
    const chatsBefore = (cursor: string) => sql`(${schema.chats.lastMessageAt}, ${schema.chats.id}) < (${db
        .select({ lastMessageAt: cursorChat.lastMessageAt, id: cursorChat.id })
        .from(cursorChat)
        .where(eq(cursorChat.id, cursor))})`;

    const rows = await db
        .select({
            id: schema.chats.id,
            createdBy: schema.chats.createdBy,
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
                // Has a message the user hasn't deleted (null until the first message).
                gt(schema.chats.lastMessageAt, sql`coalesce(${me.clearedAt}, '-infinity'::timestamp)`),
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
 * A chat's messages as `userId` sees them, newest first (by server time):
 * messages from before they deleted the chat are left out. Messages their
 * sender deleted stay in place with `body` null and `deleted` true.
 * `editedAt` is set when the text was edited. Pass the previous page's
 * `nextCursor` as `cursor` to get older messages.
 */
export async function getChatMessages(
    db: Database,
    chatId: string,
    userId: string,
    { cursor, limit }: { cursor?: string | null; limit: number },
) {
    const clearedAt = db
        .select({ clearedAt: schema.chatMembers.clearedAt })
        .from(schema.chatMembers)
        .where(and(eq(schema.chatMembers.chatId, chatId), eq(schema.chatMembers.userId, userId)));

    const messagesBefore = (cursor: string) => sql`(${schema.chatMessages.createdAt}, ${schema.chatMessages.id}) < (${db
        .select({ createdAt: cursorMessage.createdAt, id: cursorMessage.id })
        .from(cursorMessage)
        .where(eq(cursorMessage.id, cursor))})`;

    const rows = await db
        .select({
            id: schema.chatMessages.id,
            senderId: schema.chatMessages.createdBy,
            body: visibleBody,
            deleted: sql<boolean>`${schema.chatMessages.deletedAt} is not null`,
            editedAt,
            createdAt: schema.chatMessages.createdAt,
        })
        .from(schema.chatMessages)
        .where(
            and(
                eq(schema.chatMessages.chatId, chatId),
                gt(schema.chatMessages.createdAt, sql`coalesce((${clearedAt}), '-infinity'::timestamp)`),
                cursor ? messagesBefore(cursor) : undefined,
            ),
        )
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
    { senderId, ...values }: { id?: string; chatId: string; senderId: string; body: string },
) {
    await db.transaction(async (tx) => {
        const [message] = await tx
            .insert(schema.chatMessages)
            .values({ ...values, createdBy: senderId, updatedBy: senderId })
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
            .where(and(eq(schema.chatMembers.chatId, values.chatId), eq(schema.chatMembers.userId, senderId)));
    });
}

/**
 * True if this user already sent a message with `id` (a retried send).
 *
 * @throws IdConflictError if the id belongs to another message.
 */
export async function isOwnChatMessageId(db: Database, id: string, senderId: string, chatId: string) {
    const [message] = await db
        .select({ senderId: schema.chatMessages.createdBy, chatId: schema.chatMessages.chatId })
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
 * Deletes the chat for this member only. Messages up to `upToMessageId` (or
 * up to now when omitted) are hidden for them and count as read, and the
 * chat leaves their inbox until a newer message arrives. Other members keep
 * everything. Never moves backwards, so resending a delete is harmless.
 *
 * @throws ChatMessageNotFoundError if `upToMessageId` isn't in this chat.
 */
export async function clearChatForMember(
    db: Database,
    chatId: string,
    userId: string,
    upToMessageId?: string,
) {
    let upTo: SQL = sql`now()`;
    if (upToMessageId) {
        const message = db
            .select({ createdAt: schema.chatMessages.createdAt })
            .from(schema.chatMessages)
            .where(and(eq(schema.chatMessages.id, upToMessageId), eq(schema.chatMessages.chatId, chatId)));
        if ((await message).length === 0) throw new ChatMessageNotFoundError(upToMessageId);
        // Read in SQL: a JS Date would drop the microseconds and leave the
        // message itself just after the cutoff.
        upTo = sql`(${message})`;
    }

    await db
        .update(schema.chatMembers)
        .set({
            clearedAt: sql`greatest(${schema.chatMembers.clearedAt}, ${upTo})`,
            lastReadAt: sql`greatest(${schema.chatMembers.lastReadAt}, ${upTo})`,
        })
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
                ne(schema.chatMessages.createdBy, userId),
                messageNotDeleted,
                gt(schema.chatMessages.createdAt, sql`coalesce(${schema.chatMembers.lastReadAt}, '-infinity'::timestamp)`),
            ),
        )
        .where(eq(schema.chatMembers.userId, userId))
        .groupBy(schema.chatMembers.chatId, other.userId);
}

/**
 * Changes the text of a message. Only its sender may, and not once deleted.
 * The text it replaces is kept in chat_message_edits. Saving the same text
 * again is a no-op, so retries are safe. Returns the message's chat id.
 *
 * @throws ChatMessageNotFoundError if the message doesn't exist or was deleted.
 * @throws NotChatMessageSenderError if `userId` didn't send it.
 */
export async function editChatMessage(db: Database, userId: string, messageId: string, body: string) {
    return db.transaction(async (tx) => {
        // Lock it so concurrent edits each record the text they replaced.
        const [message] = await tx
            .select({
                chatId: schema.chatMessages.chatId,
                senderId: schema.chatMessages.createdBy,
                body: schema.chatMessages.body,
            })
            .from(schema.chatMessages)
            .where(and(eq(schema.chatMessages.id, messageId), messageNotDeleted))
            .for("update");
        if (!message) throw new ChatMessageNotFoundError(messageId);
        if (message.senderId !== userId) throw new NotChatMessageSenderError(messageId, userId);
        if (message.body === body) return message.chatId;

        await tx.insert(schema.chatMessageEdits).values({
            messageId,
            previousBody: message.body,
            createdBy: userId,
            updatedBy: userId,
        });
        await tx
            .update(schema.chatMessages)
            .set({ body, updatedBy: userId, updatedAt: sql`now()` })
            .where(eq(schema.chatMessages.id, messageId));
        return message.chatId;
    });
}

/**
 * Deletes a message for everyone. Only its sender may. The row (and its
 * text) stays for moderation, but members see it as deleted. Deleting it
 * again is a no-op.
 *
 * @throws ChatMessageNotFoundError if the message doesn't exist.
 * @throws NotChatMessageSenderError if `userId` didn't send it.
 */
export async function deleteChatMessage(db: Database, userId: string, messageId: string) {
    const [deleted] = await db
        .update(schema.chatMessages)
        .set({ deletedAt: sql`now()`, updatedBy: userId, updatedAt: sql`now()` })
        .where(
            and(
                eq(schema.chatMessages.id, messageId),
                eq(schema.chatMessages.createdBy, userId),
                messageNotDeleted,
            ),
        )
        .returning({ id: schema.chatMessages.id });
    if (deleted) return;

    const [message] = await db
        .select({ senderId: schema.chatMessages.createdBy })
        .from(schema.chatMessages)
        .where(eq(schema.chatMessages.id, messageId));
    if (!message) throw new ChatMessageNotFoundError(messageId);
    if (message.senderId !== userId) throw new NotChatMessageSenderError(messageId, userId);
    // Already deleted by its sender: done.
}

/** The chat a message belongs to, or null if there's no such message. */
export async function getChatMessageChatId(db: Database, messageId: string) {
    const [message] = await db
        .select({ chatId: schema.chatMessages.chatId })
        .from(schema.chatMessages)
        .where(eq(schema.chatMessages.id, messageId));
    return message?.chatId ?? null;
}

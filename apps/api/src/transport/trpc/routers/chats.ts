import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
    ChatMessageNotFoundError,
    clearChatForMember,
    deleteChatMessage,
    editChatMessage,
    getChatMemberIds,
    getChatMessageChatId,
    getChatMessages,
    getChats,
    getOrCreateDirectChat,
    getUnreadChatCounts,
    getUserIdByUsername,
    isOwnChatMessageId,
    markChatRead,
    sendChatMessage,
} from "../../../data-access";
import { fillVisiblePage, getUserBlockList, isBlocked } from "../blocking";
import { clientId, createOnce } from "../client-ids";
import { requireUserAndProfile, type TRPCContext } from "../context";
import { procedure, router } from "../trpc";

const chatIdInput = z.object({ chatId: z.string().min(1) });
const messageIdInput = z.object({ id: z.string().min(1) });
const messageBody = z.string().trim().min(1).max(2000);
const pageInput = z.object({
    cursor: z.string().nullish(),
    limit: z.number().int().min(1).max(100).default(30),
});

const chatNotFound = () => new TRPCError({ code: "NOT_FOUND", message: "CHAT_NOT_FOUND" });
const messageNotFound = () => new TRPCError({ code: "NOT_FOUND", message: "MESSAGE_NOT_FOUND" });

/**
 * CHAT_NOT_FOUND unless the caller is a member of the chat and hasn't blocked
 * (or been blocked by) the other member. Blocking hides a chat both ways.
 */
async function assertCanUseChat(ctx: TRPCContext, userId: string, chatId: string) {
    const memberIds = await getChatMemberIds(ctx.db, chatId);
    if (!memberIds.includes(userId)) throw chatNotFound();

    const blockList = await getUserBlockList(ctx);
    if (memberIds.some((id) => id !== userId && isBlocked(blockList, id))) throw chatNotFound();
}

/**
 * MESSAGE_NOT_FOUND unless the message exists and the caller is a member of
 * its chat. With `allowBlocked` false, also unless neither member blocked
 * the other.
 */
async function assertCanUseMessage(
    ctx: TRPCContext,
    userId: string,
    messageId: string,
    { allowBlocked }: { allowBlocked: boolean },
) {
    const chatId = await getChatMessageChatId(ctx.db, messageId);
    if (!chatId) throw messageNotFound();

    const memberIds = await getChatMemberIds(ctx.db, chatId);
    if (!memberIds.includes(userId)) throw messageNotFound();
    if (allowBlocked) return;

    const blockList = await getUserBlockList(ctx);
    if (memberIds.some((id) => id !== userId && isBlocked(blockList, id))) throw messageNotFound();
}

export const chatsRouter = router({
    /**
     * The id of the 1:1 chat with `username`, created if needed. It shows in
     * inboxes once it has a message. NOT_FOUND if either user blocked the other.
     */
    getOrCreateDirectChat: procedure
        .input(z.object({ username: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            const { user } = await requireUserAndProfile(ctx);

            const otherUserId = await getUserIdByUsername(ctx.db, input.username);
            if (!otherUserId || isBlocked(await getUserBlockList(ctx), otherUserId)) {
                throw new TRPCError({ code: "NOT_FOUND" });
            }
            if (otherUserId === user.id) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "CANNOT_CHAT_WITH_SELF" });
            }

            return { id: await getOrCreateDirectChat(ctx.db, user.id, otherUserId) };
        }),

    /**
     * The caller's inbox, most recent message first, minus chats with blocked
     * users. Pass `nextCursor` as `cursor`.
     */
    getMyChats: procedure.input(pageInput).query(async ({ ctx, input }) => {
        const { user } = await requireUserAndProfile(ctx);
        const blockList = await getUserBlockList(ctx);
        return fillVisiblePage(
            (cursor, limit) => getChats(ctx.db, user.id, { cursor, limit }),
            input,
            (c) => !isBlocked(blockList, c.otherMember.userId),
            (c) => c.id,
        );
    }),

    /** Total unread messages across the caller's (visible) chats, for a badge. */
    getMyUnreadCount: procedure.query(async ({ ctx }) => {
        const { user } = await requireUserAndProfile(ctx);
        const [counts, blockList] = await Promise.all([
            getUnreadChatCounts(ctx.db, user.id),
            getUserBlockList(ctx),
        ]);
        return counts
            .filter((c) => !isBlocked(blockList, c.otherUserId))
            .reduce((total, c) => total + c.count, 0);
    }),

    /**
     * A chat's messages, newest first, minus any from before the caller
     * deleted the chat. Pass `nextCursor` as `cursor` for older ones.
     */
    getMessages: procedure.input(chatIdInput.extend(pageInput.shape)).query(async ({ ctx, input }) => {
        const { user } = await requireUserAndProfile(ctx);
        await assertCanUseChat(ctx, user.id, input.chatId);

        const { chatId, ...page } = input;
        return getChatMessages(ctx.db, chatId, user.id, page);
    }),

    /**
     * Sends a message. `id` is an optional client-generated ULID; retrying with
     * it succeeds without sending twice. Returns nothing.
     */
    sendMessage: procedure
        .input(chatIdInput.extend({ id: clientId.optional(), body: messageBody }))
        .mutation(async ({ ctx, input }) => {
            const { user } = await requireUserAndProfile(ctx);
            await assertCanUseChat(ctx, user.id, input.chatId);

            await createOnce(
                input.id,
                () => isOwnChatMessageId(ctx.db, input.id!, user.id, input.chatId),
                () => sendChatMessage(ctx.db, { ...input, senderId: user.id }),
            );
        }),

    /**
     * Changes the text of one of the caller's messages; it shows as edited.
     * The previous text is kept for moderation (never shown to members).
     * FORBIDDEN "NOT_MESSAGE_SENDER" for someone else's message;
     * MESSAGE_NOT_FOUND if it was deleted, or either member blocked the
     * other. Returns nothing; resending the same edit is harmless.
     */
    editMessage: procedure
        .input(messageIdInput.extend({ body: messageBody }))
        .mutation(async ({ ctx, input }) => {
            const { user } = await requireUserAndProfile(ctx);
            await assertCanUseMessage(ctx, user.id, input.id, { allowBlocked: false });
            await editChatMessage(ctx.db, user.id, input.id, input.body);
        }),

    /**
     * Deletes one of the caller's messages for everyone: members see a
     * "deleted" placeholder instead. FORBIDDEN "NOT_MESSAGE_SENDER" for
     * someone else's message. Works in chats with blocked users too.
     * Returns nothing; deleting again is harmless.
     */
    deleteMessage: procedure.input(messageIdInput).mutation(async ({ ctx, input }) => {
        const { user } = await requireUserAndProfile(ctx);
        await assertCanUseMessage(ctx, user.id, input.id, { allowBlocked: true });
        await deleteChatMessage(ctx.db, user.id, input.id);
    }),

    /** Marks the chat read up to now for the caller. */
    markRead: procedure.input(chatIdInput).mutation(async ({ ctx, input }) => {
        const { user } = await requireUserAndProfile(ctx);
        await assertCanUseChat(ctx, user.id, input.chatId);
        await markChatRead(ctx.db, input.chatId, user.id);
    }),

    /**
     * Deletes the chat for the caller only: its messages are hidden for them
     * and it leaves their inbox until someone sends a new message. The other
     * member keeps the whole chat. Pass `upToMessageId` (the newest message
     * the caller has seen) so a delete resent later, e.g. from an offline
     * queue, doesn't also hide messages that arrived since; otherwise it
     * deletes up to now. Works on chats with blocked users too. Returns
     * nothing.
     */
    deleteChat: procedure
        .input(chatIdInput.extend({ upToMessageId: z.string().min(1).optional() }))
        .mutation(async ({ ctx, input }) => {
            const { user } = await requireUserAndProfile(ctx);
            const memberIds = await getChatMemberIds(ctx.db, input.chatId);
            if (!memberIds.includes(user.id)) throw chatNotFound();

            try {
                await clearChatForMember(ctx.db, input.chatId, user.id, input.upToMessageId);
            } catch (err) {
                if (err instanceof ChatMessageNotFoundError) {
                    throw new TRPCError({ code: "NOT_FOUND", message: "MESSAGE_NOT_FOUND" });
                }
                throw err;
            }
        }),
});

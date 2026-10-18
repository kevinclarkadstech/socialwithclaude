import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
    getChatMemberIds,
    getChatMessages,
    getChats,
    getOrCreateDirectChat,
    getUnreadChatCounts,
    getUserIdByUsername,
    isOwnChatMessageId,
    markChatRead,
    sendChatMessage,
} from "../../data-access";
import { fillVisiblePage, getUserBlockList, isBlocked } from "../blocking";
import { clientId, createOnce } from "../client-ids";
import { requireUserAndProfile, type TRPCContext } from "../context";
import { procedure, router } from "../trpc";

const chatIdInput = z.object({ chatId: z.string().min(1) });
const pageInput = z.object({
    cursor: z.string().nullish(),
    limit: z.number().int().min(1).max(100).default(30),
});

const chatNotFound = () => new TRPCError({ code: "NOT_FOUND", message: "CHAT_NOT_FOUND" });

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

    /** A chat's messages, newest first. Pass `nextCursor` as `cursor` for older ones. */
    getMessages: procedure.input(chatIdInput.extend(pageInput.shape)).query(async ({ ctx, input }) => {
        const { user } = await requireUserAndProfile(ctx);
        await assertCanUseChat(ctx, user.id, input.chatId);

        const { chatId, ...page } = input;
        return getChatMessages(ctx.db, chatId, page);
    }),

    /**
     * Sends a message. `id` is an optional client-generated ULID; retrying with
     * it succeeds without sending twice. Returns nothing.
     */
    sendMessage: procedure
        .input(chatIdInput.extend({ id: clientId.optional(), body: z.string().trim().min(1).max(2000) }))
        .mutation(async ({ ctx, input }) => {
            const { user } = await requireUserAndProfile(ctx);
            await assertCanUseChat(ctx, user.id, input.chatId);

            await createOnce(
                input.id,
                () => isOwnChatMessageId(ctx.db, input.id!, user.id, input.chatId),
                () => sendChatMessage(ctx.db, { ...input, senderId: user.id }),
            );
        }),

    /** Marks the chat read up to now for the caller. */
    markRead: procedure.input(chatIdInput).mutation(async ({ ctx, input }) => {
        const { user } = await requireUserAndProfile(ctx);
        await assertCanUseChat(ctx, user.id, input.chatId);
        await markChatRead(ctx.db, input.chatId, user.id);
    }),
});

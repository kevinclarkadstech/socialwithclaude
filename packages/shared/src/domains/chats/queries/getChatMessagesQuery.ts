import z from "zod";
import type { Query } from "../../../types/query";
import { succeed } from "../../../utils/result";
import { PageInputSchema, type Page } from "../../../common/types/page";
import { canViewChat } from "../../../logic/authorization/chats/canViewChat";
import { logDisallowedResult } from "../../../logic/authorization/logDisallowedResult";
import type { GetCallingUser } from "../../users/types/calling-user";
import { ChatSchema } from "../types/chat";
import type { ChatMember } from "../types/chat-member";
import { ChatMessageSchema, type ChatMessage } from "../types/chat-message";

export const GetChatMessagesQueryInputSchema = PageInputSchema.extend({
    chatId: ChatSchema.shape.id,
});

export type GetChatMessagesQueryInput = z.infer<typeof GetChatMessagesQueryInputSchema>;

export const GetChatMessagesQueryOutputSchema = z.object({
    items: z.array(ChatMessageSchema),
    nextCursor: z.string().nullable(),
});

export type GetChatMessagesQueryOutput = z.infer<typeof GetChatMessagesQueryOutputSchema>;

/** A chat's messages, newest first, minus any from before the caller deleted the chat. */
export const getChatMessagesQuery: Query<{ input: GetChatMessagesQueryInput, output: GetChatMessagesQueryOutput }, {
    getCallingUser: GetCallingUser;
    getChatMembers: (args: { chatId: string }) => Promise<ChatMember[]>;
    getChatMessages: (args: {
        chatId: string;
        viewerId: string | null;
        after?: string | null;
        cursor?: string | null;
        limit: number;
    }) => Promise<Page<ChatMessage>>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const members = await dependencies.getChatMembers({ chatId: input.chatId });

    const caller = await dependencies.getCallingUser();
    const allowed = canViewChat(caller, members);
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "get-chat-messages", callerId: caller?.userId, chatId: input.chatId },
        });
        return allowed;
    }

    // canViewChat checked the caller is a member.
    const member = members.find((m) => m.userId === allowed.value.userId)!;
    const page = await dependencies.getChatMessages({ ...input, viewerId: allowed.value.userId, after: member.clearedAt });
    return succeed(page);
}

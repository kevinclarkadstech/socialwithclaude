import z from "zod";
import type { Query } from "../../../../types/query";
import { fail, succeed } from "../../../../utils/result";
import { notFoundError } from "../../../../error-handling";
import { canViewChat } from "../../authorization/canViewChat/canViewChat";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../../users/types/calling-user";
import { ChatSchema, ChatViewSchema, type ChatView } from "../../types/chat";
import type { ChatMember } from "../../types/chat-member";

export const GetChatQueryInputSchema = z.object({
    chatId: ChatSchema.shape.id,
});

export type GetChatQueryInput = z.infer<typeof GetChatQueryInputSchema>;

export const GetChatQueryOutputSchema = ChatViewSchema;

export type GetChatQueryOutput = z.infer<typeof GetChatQueryOutputSchema>;

/** One of the caller's chats, as in their inbox. Not found for anyone who isn't in it. */
export const getChatQuery: Query<{ input: GetChatQueryInput, output: GetChatQueryOutput }, {
    getCallingUser: GetCallingUser;
    getChatMembers: (args: { chatId: string }) => Promise<Pick<ChatMember, "userId">[]>;
    getChatViewById: (args: { chatId: string; viewerId: string }) => Promise<ChatView | null>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const members = await dependencies.getChatMembers({ chatId: input.chatId });

    const caller = await dependencies.getCallingUser();
    const allowed = canViewChat({ caller, members });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "get-chat", callerId: caller?.userId, chatId: input.chatId },
        });
        return allowed;
    }

    const chat = await dependencies.getChatViewById({ chatId: input.chatId, viewerId: allowed.value.userId });
    if (!chat) {
        // A member, so it exists: deleted between the two reads.
        logger.info("Chat not found", { chatId: input.chatId });
        return fail(notFoundError("Chat not found"));
    }
    return succeed(chat);
};

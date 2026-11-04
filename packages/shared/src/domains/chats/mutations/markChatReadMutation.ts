import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { fail, succeed } from "../../../utils/result";
import { notFoundError } from "../../../error-handling";
import { canViewChat } from "../../../logic/authorization/chats/canViewChat";
import { logDisallowedResult } from "../../../logic/authorization/logDisallowedResult";
import type { GetCallingUser } from "../../users/types/calling-user";
import { ChatMemberSchema, type ChatMember } from "../types/chat-member";

export const MarkChatReadMutationInputSchema = ChatMemberSchema.pick({ chatId: true });

export type MarkChatReadMutationInput = z.infer<typeof MarkChatReadMutationInputSchema>;

export const MarkChatReadMutationOutputSchema = ChatMemberSchema;

export type MarkChatReadMutationOutput = z.infer<typeof MarkChatReadMutationOutputSchema>;

/** Marks everything in a chat as read for the caller. */
export const markChatReadMutation: Mutation<{ input: MarkChatReadMutationInput, output: MarkChatReadMutationOutput }, {
    getCallingUser: GetCallingUser;
    getChatMembers: (args: { chatId: string }) => Promise<ChatMember[]>;
    markChatRead: (args: { chatId: string; userId: string }) => Promise<ChatMember | null>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const members = await dependencies.getChatMembers({ chatId: input.chatId });

    const caller = await dependencies.getCallingUser();
    const allowed = canViewChat(caller, members);
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "mark-chat-read", callerId: caller?.userId, chatId: input.chatId },
        });
        return allowed;
    }

    const member = await dependencies.markChatRead({ chatId: input.chatId, userId: allowed.value.userId });
    if (!member) {
        logger.info("Chat member removed during mark-chat-read", { chatId: input.chatId, callerId: allowed.value.userId });
        return fail(notFoundError("Chat not found"));
    }

    return succeed(member);
}

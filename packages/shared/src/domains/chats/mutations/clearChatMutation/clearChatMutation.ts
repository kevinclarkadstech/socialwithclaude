import z from "zod";
import type { Mutation } from "../../../../types/mutation";
import { fail, succeed } from "../../../../utils/result";
import { notFoundError } from "../../../../error-handling";
import { canViewChat } from "../../authorization/canViewChat/canViewChat";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../../users/types/calling-user";
import { ChatMemberSchema, type ChatMember } from "../../types/chat-member";

export const ClearChatMutationInputSchema = ChatMemberSchema.pick({ chatId: true });

export type ClearChatMutationInput = z.infer<typeof ClearChatMutationInputSchema>;

export const ClearChatMutationOutputSchema = ChatMemberSchema;

export type ClearChatMutationOutput = z.infer<typeof ClearChatMutationOutputSchema>;

/** Deletes a chat for the caller only: its messages so far are hidden for them. */
export const clearChatMutation: Mutation<{ input: ClearChatMutationInput, output: ClearChatMutationOutput }, {
    getCallingUser: GetCallingUser;
    getChatMembers: (args: { chatId: string }) => Promise<ChatMember[]>;
    clearChat: (args: { chatId: string; userId: string }) => Promise<ChatMember | null>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const members = await dependencies.getChatMembers({ chatId: input.chatId });

    const caller = await dependencies.getCallingUser();
    const allowed = canViewChat({ caller, members });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "clear-chat", callerId: caller?.userId, chatId: input.chatId },
        });
        return allowed;
    }

    const member = await dependencies.clearChat({ chatId: input.chatId, userId: allowed.value.userId });
    if (!member) {
        logger.info("Chat member removed during clear-chat", { chatId: input.chatId, callerId: allowed.value.userId });
        return fail(notFoundError("Chat not found"));
    }

    return succeed(member);
}

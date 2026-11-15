import z from "zod";
import type { Mutation } from "../../../../types/mutation";
import { fail, succeed } from "../../../../utils/result";
import { notFoundError } from "../../../../error-handling";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../../users/types/calling-user";
import type { ChatMember } from "../../types/chat-member";
import { ChatMessageSchema, type ChatMessageView } from "../../types/chat-message";
import { canSaveChatMessage } from "../../authorization/canSaveChatMessage/canSaveChatMessage";

export const SaveChatMessageMutationInputSchema = z.object({
    chatMessageId: ChatMessageSchema.shape.id,
});

export type SaveChatMessageMutationInput = z.infer<typeof SaveChatMessageMutationInputSchema>;

export const SaveChatMessageMutationOutputSchema = z.null();

export type SaveChatMessageMutationOutput = z.infer<typeof SaveChatMessageMutationOutputSchema>;

/** Saves a message from one of the caller's chats. Saving again succeeds. */
export const saveChatMessageMutation: Mutation<{ input: SaveChatMessageMutationInput, output: SaveChatMessageMutationOutput }, {
    getCallingUser: GetCallingUser;
    getChatMessageViewById: (args: { id: string; viewerId: string | null }) => Promise<ChatMessageView | null>;
    // Only who's in the chat is used.
    getChatMembers: (args: { chatId: string }) => Promise<Pick<ChatMember, "userId">[]>;
    saveChatMessage: (args: { userId: string; chatMessageId: string }) => Promise<boolean>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const message = await dependencies.getChatMessageViewById({ id: input.chatMessageId, viewerId: caller?.userId ?? null });
    if (!message) {
        logger.info("Message to save not found", { chatMessageId: input.chatMessageId });
        return fail(notFoundError("Message not found"));
    }

    const members = await dependencies.getChatMembers({ chatId: message.chatId });
    const allowed = canSaveChatMessage({ caller, members });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "save-chat-message", callerId: caller?.userId, chatMessageId: message.id, chatId: message.chatId },
        });
        return allowed;
    }

    await dependencies.saveChatMessage({ userId: allowed.value.userId, chatMessageId: message.id });
    return succeed();
};

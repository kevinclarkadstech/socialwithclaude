import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { fail, succeed } from "../../../utils/result";
import { notFoundError } from "../../../error-handling";
import { canUpdateChatMessage } from "../../../logic/authorization/chats/canUpdateChatMessage";
import { logDisallowedResult } from "../../../logic/authorization/logDisallowedResult";
import type { GetCallingUser } from "../../users/types/calling-user";
import { ChatMessageSchema, ChatMessageViewSchema, type ChatMessageView } from "../types/chat-message";

export const UpdateChatMessageMutationInputSchema = ChatMessageSchema.pick({ id: true, content: true });

export type UpdateChatMessageMutationInput = z.infer<typeof UpdateChatMessageMutationInputSchema>;

export const UpdateChatMessageMutationOutputSchema = ChatMessageViewSchema;

export type UpdateChatMessageMutationOutput = z.infer<typeof UpdateChatMessageMutationOutputSchema>;

export const updateChatMessageMutation: Mutation<{ input: UpdateChatMessageMutationInput, output: UpdateChatMessageMutationOutput }, {
    getCallingUser: GetCallingUser;
    getChatMessageViewById: (args: { id: string; viewerId: string | null }) => Promise<ChatMessageView | null>;
    updateChatMessage: (args: { id: string; userId: string; content: string }) => Promise<ChatMessageView | null>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const message = await dependencies.getChatMessageViewById({ id: input.id, viewerId: caller?.userId ?? null });
    if (!message) {
        logger.info("Message to update not found", { chatMessageId: input.id });
        return fail(notFoundError("Message not found"));
    }

    const allowed = canUpdateChatMessage({ caller, message });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "update-chat-message", callerId: caller?.userId, chatMessageId: message.id },
        });
        return allowed;
    }

    const updatedMessage = await dependencies.updateChatMessage({ ...input, userId: allowed.value.userId });
    if (!updatedMessage) {
        logger.info("Message deleted before it could be updated", { chatMessageId: message.id });
        return fail(notFoundError("Message not found"));
    }

    return succeed(updatedMessage);
}

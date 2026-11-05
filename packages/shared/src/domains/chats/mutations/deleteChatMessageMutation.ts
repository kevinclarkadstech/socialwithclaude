import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { fail, succeed } from "../../../utils/result";
import { notFoundError } from "../../../error-handling";
import { canDeleteChatMessage } from "../../../logic/authorization/chats/canDeleteChatMessage";
import { logDisallowedResult } from "../../../logic/authorization/logDisallowedResult";
import type { GetCallingUser } from "../../users/types/calling-user";
import { ChatMessageSchema, type ChatMessage } from "../types/chat-message";

export const DeleteChatMessageMutationInputSchema = ChatMessageSchema.pick({ id: true });

export type DeleteChatMessageMutationInput = z.infer<typeof DeleteChatMessageMutationInputSchema>;

export const DeleteChatMessageMutationOutputSchema = z.undefined();

export type DeleteChatMessageMutationOutput = z.infer<typeof DeleteChatMessageMutationOutputSchema>;

/** Deletes a message for everyone. */
export const deleteChatMessageMutation: Mutation<{ input: DeleteChatMessageMutationInput, output: DeleteChatMessageMutationOutput }, {
    getCallingUser: GetCallingUser;
    getChatMessageById: (args: { id: string; viewerId: string | null }) => Promise<ChatMessage | null>;
    deleteChatMessage: (args: { id: string; userId: string }) => Promise<boolean>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const message = await dependencies.getChatMessageById({ id: input.id, viewerId: caller?.userId ?? null });
    if (!message) {
        logger.info("Message to delete not found", { chatMessageId: input.id });
        return fail(notFoundError("Message not found"));
    }

    const allowed = canDeleteChatMessage(caller, message);
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "delete-chat-message", callerId: caller?.userId, chatMessageId: message.id },
        });
        return allowed;
    }

    await dependencies.deleteChatMessage({ id: message.id, userId: allowed.value.userId });
    return succeed();
}

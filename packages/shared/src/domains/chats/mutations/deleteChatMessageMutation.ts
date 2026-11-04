import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { succeed } from "../../../utils/result";
import { notFound } from "../../../utils/failures";
import { canDeleteChatMessage } from "../../../logic/authorization/chats/canDeleteChatMessage";
import type { GetCallingUser } from "../../users/types/calling-user";
import { ChatMessageSchema, type ChatMessage } from "../types/chat-message";

export const DeleteChatMessageMutationInputSchema = ChatMessageSchema.pick({ id: true });

export type DeleteChatMessageMutationInput = z.infer<typeof DeleteChatMessageMutationInputSchema>;

export const DeleteChatMessageMutationOutputSchema = z.undefined();

export type DeleteChatMessageMutationOutput = z.infer<typeof DeleteChatMessageMutationOutputSchema>;

/** Deletes a message for everyone. */
export const deleteChatMessageMutation: Mutation<{ input: DeleteChatMessageMutationInput, output: DeleteChatMessageMutationOutput }, {
    getCallingUser: GetCallingUser;
    getChatMessageById: (args: { id: string }) => Promise<ChatMessage | null>;
    deleteChatMessage: (args: { id: string; userId: string }) => Promise<boolean>;
}> = async ({ input, dependencies }) => {
    const message = await dependencies.getChatMessageById({ id: input.id });
    if (!message) return notFound("Message not found");

    const allowed = canDeleteChatMessage(await dependencies.getCallingUser(), message);
    if (!allowed.ok) return allowed;

    await dependencies.deleteChatMessage({ id: input.id, userId: allowed.value.userId });
    return succeed();
}

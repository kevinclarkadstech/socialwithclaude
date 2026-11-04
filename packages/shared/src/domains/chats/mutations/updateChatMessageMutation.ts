import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { succeed } from "../../../utils/result";
import { notFound } from "../../../utils/failures";
import { canUpdateChatMessage } from "../../../logic/authorization/chats/canUpdateChatMessage";
import type { GetCallingUser } from "../../users/types/calling-user";
import { ChatMessageSchema, type ChatMessage } from "../types/chat-message";

export const UpdateChatMessageMutationInputSchema = ChatMessageSchema.pick({ id: true, content: true });

export type UpdateChatMessageMutationInput = z.infer<typeof UpdateChatMessageMutationInputSchema>;

export const UpdateChatMessageMutationOutputSchema = ChatMessageSchema;

export type UpdateChatMessageMutationOutput = z.infer<typeof UpdateChatMessageMutationOutputSchema>;

export const updateChatMessageMutation: Mutation<{ input: UpdateChatMessageMutationInput, output: UpdateChatMessageMutationOutput }, {
    getCallingUser: GetCallingUser;
    getChatMessageById: (args: { id: string }) => Promise<ChatMessage | null>;
    updateChatMessage: (args: { id: string; userId: string; content: string }) => Promise<ChatMessage | null>;
}> = async ({ input, dependencies }) => {
    const message = await dependencies.getChatMessageById({ id: input.id });
    if (!message) return notFound("Message not found");

    const allowed = canUpdateChatMessage(await dependencies.getCallingUser(), message);
    if (!allowed.ok) return allowed;

    const updated = await dependencies.updateChatMessage({ ...input, userId: allowed.value.userId });
    if (!updated) return notFound("Message not found");
    return succeed(updated);
}

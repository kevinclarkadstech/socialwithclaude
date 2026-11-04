import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { succeed } from "../../../utils/result";
import { conflict, notFound } from "../../../utils/failures";
import { canCreateDirectChat } from "../../../logic/authorization/chats/canCreateDirectChat";
import type { GetCallingUser } from "../../users/types/calling-user";
import { UserProfileSchema, type UserProfile } from "../../users/types/user-profile";
import { ChatSchema, type Chat } from "../types/chat";

export const GetOrCreateDirectChatMutationInputSchema = ChatSchema.pick({ id: true }).extend({
    username: UserProfileSchema.shape.username,
});

export type GetOrCreateDirectChatMutationInput = z.infer<typeof GetOrCreateDirectChatMutationInputSchema>;

export const GetOrCreateDirectChatMutationOutputSchema = ChatSchema;

export type GetOrCreateDirectChatMutationOutput = z.infer<typeof GetOrCreateDirectChatMutationOutputSchema>;

/**
 * The caller's chat with `username`, started with the client's `id` if they
 * don't have one yet.
 */
export const getOrCreateDirectChatMutation: Mutation<{ input: GetOrCreateDirectChatMutationInput, output: GetOrCreateDirectChatMutationOutput }, {
    getCallingUser: GetCallingUser;
    getUserProfileByUsername: (args: { username: string }) => Promise<UserProfile | null>;
    createDirectChat: (args: { id: string; userId: string; receiverId: string }) => Promise<Chat | null>;
}> = async ({ input, dependencies }) => {
    const receiver = await dependencies.getUserProfileByUsername({ username: input.username });
    if (!receiver) return notFound("User not found");

    const allowed = canCreateDirectChat(await dependencies.getCallingUser(), receiver);
    if (!allowed.ok) return allowed;

    const chat = await dependencies.createDirectChat({ id: input.id, userId: allowed.value.userId, receiverId: receiver.userId });
    if (!chat) return conflict("Chat id is already used");
    return succeed(chat);
}

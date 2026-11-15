import z from "zod";
import type { Mutation } from "../../../../types/mutation";
import { succeed } from "../../../../utils/result";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../../users/types/calling-user";
import { ChatMessageSchema } from "../../types/chat-message";
import { canUnsaveChatMessage } from "../../authorization/canUnsaveChatMessage/canUnsaveChatMessage";

export const UnsaveChatMessageMutationInputSchema = z.object({
    chatMessageId: ChatMessageSchema.shape.id,
});

export type UnsaveChatMessageMutationInput = z.infer<typeof UnsaveChatMessageMutationInputSchema>;

export const UnsaveChatMessageMutationOutputSchema = z.null();

export type UnsaveChatMessageMutationOutput = z.infer<typeof UnsaveChatMessageMutationOutputSchema>;

/** Unsaves a chat message. Unsaving one that isn't saved succeeds. */
export const unsaveChatMessageMutation: Mutation<{ input: UnsaveChatMessageMutationInput, output: UnsaveChatMessageMutationOutput }, {
    getCallingUser: GetCallingUser;
    unsaveChatMessage: (args: { userId: string; chatMessageId: string }) => Promise<boolean>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = canUnsaveChatMessage({ caller });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "unsave-chat-message", callerId: caller?.userId, chatMessageId: input.chatMessageId },
        });
        return allowed;
    }

    await dependencies.unsaveChatMessage({ userId: allowed.value.userId, chatMessageId: input.chatMessageId });
    return succeed();
};

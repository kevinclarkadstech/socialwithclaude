import { z } from "zod";
import { BaseUserCreatedEntitySchema } from "../../../common/types/base-user-created-entity";
import { UserProfileSummarySchema } from "../../users/types/user-profile-summary";

/** A chat message as stored (one row of chat_messages); created_by is the sender. What mutations take and save. */
export const ChatMessageSchema = BaseUserCreatedEntitySchema.extend({
    chatId: z.ulid(),
    content: z.string().trim().min(1).max(2000),
});

/** A chat message as it's shown: with its sender, and how it looks to the viewer. */
export const ChatMessageViewSchema = ChatMessageSchema.extend({
    creator: UserProfileSummarySchema,
    viewer: z.object({
        hasSaved: z.boolean(),
    }),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatMessageView = z.infer<typeof ChatMessageViewSchema>;

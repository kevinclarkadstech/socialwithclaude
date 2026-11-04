import { z } from "zod";
import { BaseUserCreatedEntitySchema } from "../../../common/types/base-user-created-entity";

/** created_by is the sender. */
export const ChatMessageSchema = BaseUserCreatedEntitySchema.extend({
    chatId: z.ulid(),
    content: z.string().trim().min(1).max(2000),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

import { z } from "zod";
import { BaseUserCreatedEntitySchema } from "../../../types/base-user-created-entity";

/**
 * A private conversation. Only 1:1 chats for now: `createdBy` started it and
 * `receiverId` is the other member (null for future group chats).
 */
export const ChatSchema = BaseUserCreatedEntitySchema.extend({
    receiverId: z.ulid().nullable(),
    lastMessageAt: z.iso.datetime().nullable(),
});

export type Chat = z.infer<typeof ChatSchema>;

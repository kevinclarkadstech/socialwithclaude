import { z } from "zod";
import { BaseUserCreatedEntitySchema } from "../../../types/base-user-created-entity";
import { UserProfileSummarySchema } from "../../users/types/user-profile-summary";

/**
 * A private conversation. Only 1:1 chats for now: `createdBy` started it and
 * `receiverId` is the other member (null for future group chats).
 */
export const ChatSchema = BaseUserCreatedEntitySchema.extend({
    receiverId: z.ulid().nullable(),
    lastMessageAt: z.iso.datetime().nullable(),
});

export type Chat = z.infer<typeof ChatSchema>;

/**
 * A chat as it's shown to one of its members: who they're talking to, the
 * newest message they can see (not deleted, not from before they cleared
 * the chat), and whether anything from the other person is unread.
 */
export const ChatViewSchema = ChatSchema.extend({
    otherMember: UserProfileSummarySchema,
    lastMessage: z.object({
        content: z.string(),
        createdBy: z.ulid(),
        createdAt: z.iso.datetime(),
    }).nullable(),
    viewer: z.object({
        hasUnread: z.boolean(),
    }),
});

export type ChatView = z.infer<typeof ChatViewSchema>;

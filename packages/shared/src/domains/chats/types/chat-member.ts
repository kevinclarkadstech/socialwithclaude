import { z } from "zod";

export const ChatMemberSchema = z.object({
    chatId: z.ulid(),
    userId: z.ulid(),
    // Messages after this are unread for this member.
    lastReadAt: z.iso.datetime().nullable(),
    // When the member deleted the chat for themselves: earlier messages are hidden for them.
    clearedAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
});

/**
 * A member with whether they're banned right now: a chat with a banned
 * person stays (with its history), but nobody can send in it until the ban ends.
 */
export const ChatMemberViewSchema = ChatMemberSchema.extend({
    isBanned: z.boolean(),
});

export type ChatMember = z.infer<typeof ChatMemberSchema>;
export type ChatMemberView = z.infer<typeof ChatMemberViewSchema>;

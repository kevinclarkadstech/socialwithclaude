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

export type ChatMember = z.infer<typeof ChatMemberSchema>;

import { z } from "zod";
import { UserProfileSummarySchema } from "../../users/types/user-profile-summary";
import { ChatMessageViewSchema } from "./chat-message";

/** A message found by searching the caller's chats, with who the chat is with. */
export const ChatMessageSearchResultSchema = z.object({
    message: ChatMessageViewSchema,
    otherMember: UserProfileSummarySchema,
});

export type ChatMessageSearchResult = z.infer<typeof ChatMessageSearchResultSchema>;

import { z } from "zod";
import { BaseUserCreatedEntitySchema } from "../../../types/base-user-created-entity";
import { ReportReasonSchema, ReportStatusSchema } from "../../posts/types/report";
import { ChatMessageViewSchema } from "./chat-message";

/** A message as kept in a report: as sent, not as the reporter sees it. */
const ReportedChatMessageSchema = ChatMessageViewSchema.omit({ viewer: true });

/**
 * A report about a chat message. created_by is the reporter. `snapshot` is
 * the message as it was when reported, and the messages before it that the
 * reporter could see (oldest first), so a moderator sees the conversation.
 */
export const ChatMessageReportSchema = BaseUserCreatedEntitySchema.extend({
    chatMessageId: z.ulid(),
    reason: ReportReasonSchema,
    details: z.string().trim().max(1000).nullable(),
    status: ReportStatusSchema,
    snapshot: z.object({
        message: ReportedChatMessageSchema,
        earlier: z.array(ReportedChatMessageSchema),
    }),
});

export type ReportedChatMessage = z.infer<typeof ReportedChatMessageSchema>;
export type ChatMessageReport = z.infer<typeof ChatMessageReportSchema>;

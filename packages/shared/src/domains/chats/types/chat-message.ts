import { z } from "zod";
import { BaseUserCreatedEntitySchema } from "../../../common/types/base-user-created-entity";
import { UserProfileSummarySchema } from "../../users/types/user-profile-summary";

/** created_by is the sender. */
export const ChatMessageSchema = BaseUserCreatedEntitySchema.extend({
    chatId: z.ulid(),
    content: z.string().trim().min(1).max(2000),
    creator: UserProfileSummarySchema,
    // How the message looks to whoever is asking.
    viewer: z.object({
        hasSaved: z.boolean(),
    }),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

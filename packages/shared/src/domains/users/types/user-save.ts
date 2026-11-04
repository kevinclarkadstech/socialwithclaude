import z from "zod";
import { PostSchema } from "../../posts/types/post";
import { PostCommentSchema } from "../../posts/types/post-comment";
import { ChatMessageSchema } from "../../chats/types/chat-message";

export const UserSaveTypeSchema = z.enum(["post", "postComment", "chatMessage"]);

const UserSaveFieldsSchema = z.object({
    userId: z.ulid(),
    createdAt: z.iso.datetime(),
});

/** Something a user saved, with the saved item. */
export const UserSaveSchema = z.discriminatedUnion("type", [
    UserSaveFieldsSchema.extend({
        type: z.literal(UserSaveTypeSchema.enum.post),
        post: PostSchema,
    }),
    UserSaveFieldsSchema.extend({
        type: z.literal(UserSaveTypeSchema.enum.postComment),
        postComment: PostCommentSchema,
    }),
    UserSaveFieldsSchema.extend({
        type: z.literal(UserSaveTypeSchema.enum.chatMessage),
        chatMessage: ChatMessageSchema,
    }),
]);

export type UserSaveType = z.infer<typeof UserSaveTypeSchema>;
export type UserSave = z.infer<typeof UserSaveSchema>;

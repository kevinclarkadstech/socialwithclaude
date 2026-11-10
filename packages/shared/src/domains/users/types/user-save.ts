import z from "zod";
import { PostViewSchema } from "../../posts/types/post";
import { PostCommentViewSchema } from "../../posts/types/post-comment";
import { ChatMessageViewSchema } from "../../chats/types/chat-message";

export const UserSaveTypeSchema = z.enum(["post", "postComment", "chatMessage"]);

const UserSaveFieldsSchema = z.object({
    userId: z.ulid(),
    createdAt: z.iso.datetime(),
});

/** Something a user saved, with the saved item. */
export const UserSaveSchema = z.discriminatedUnion("type", [
    UserSaveFieldsSchema.extend({
        type: z.literal(UserSaveTypeSchema.enum.post),
        post: PostViewSchema,
    }),
    UserSaveFieldsSchema.extend({
        type: z.literal(UserSaveTypeSchema.enum.postComment),
        postComment: PostCommentViewSchema,
    }),
    UserSaveFieldsSchema.extend({
        type: z.literal(UserSaveTypeSchema.enum.chatMessage),
        chatMessage: ChatMessageViewSchema,
    }),
]);

export type UserSaveType = z.infer<typeof UserSaveTypeSchema>;
export type UserSave = z.infer<typeof UserSaveSchema>;

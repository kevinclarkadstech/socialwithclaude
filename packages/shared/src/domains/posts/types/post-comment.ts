import { z } from "zod";
import { BaseUserCreatedEntitySchema } from "../../../common/types/base-user-created-entity";

export const PostCommentSchema = BaseUserCreatedEntitySchema.extend({
    postId: z.ulid(),
    content: z.string().trim().min(1).max(2000),
    numUpVotes: z.int().min(0),
    numDownVotes: z.int().min(0),
});

export type PostComment = z.infer<typeof PostCommentSchema>;

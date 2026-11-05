import { z } from "zod";
import { BaseUserCreatedEntitySchema } from "../../../common/types/base-user-created-entity";
import { UserProfileSummarySchema } from "../../users/types/user-profile-summary";
import { PostCommentVoteValueSchema } from "./post-comment-vote";

export const PostCommentSchema = BaseUserCreatedEntitySchema.extend({
    postId: z.ulid(),
    content: z.string().trim().min(1).max(2000),
    numUpVotes: z.int().min(0),
    numDownVotes: z.int().min(0),
    creator: UserProfileSummarySchema,
    // How the comment looks to whoever is asking; empty when signed out.
    viewer: z.object({
        hasSaved: z.boolean(),
        vote: PostCommentVoteValueSchema.nullable(),
    }),
});

export type PostComment = z.infer<typeof PostCommentSchema>;

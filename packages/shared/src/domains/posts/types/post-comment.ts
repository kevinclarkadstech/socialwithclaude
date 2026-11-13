import { z } from "zod";
import { BaseUserCreatedEntitySchema } from "../../../types/base-user-created-entity";
import { UserProfileSummarySchema } from "../../users/types/user-profile-summary";
import { PostCommentVoteValueSchema } from "./post-comment-vote";

/** A comment as stored (one row of post_comments). What mutations take and save. */
export const PostCommentSchema = BaseUserCreatedEntitySchema.extend({
    postId: z.ulid(),
    content: z.string().trim().min(1).max(2000),
    numUpVotes: z.int().min(0),
    numDownVotes: z.int().min(0),
});

/** A comment as it's shown: with who wrote it, and how it looks to the viewer (empty when signed out). */
export const PostCommentViewSchema = PostCommentSchema.extend({
    creator: UserProfileSummarySchema,
    viewer: z.object({
        hasSaved: z.boolean(),
        vote: PostCommentVoteValueSchema.nullable(),
    }),
});

export type PostComment = z.infer<typeof PostCommentSchema>;
export type PostCommentView = z.infer<typeof PostCommentViewSchema>;

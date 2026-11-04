import { z } from "zod";

export const PostCommentVoteValueSchema = z.union([z.literal(-1), z.literal(1)]);

export const PostCommentVoteSchema = z.object({
    userId: z.ulid(),
    postCommentId: z.ulid(),
    value: PostCommentVoteValueSchema,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
});

export type PostCommentVoteValue = z.infer<typeof PostCommentVoteValueSchema>;
export type PostCommentVote = z.infer<typeof PostCommentVoteSchema>;

import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { succeed } from "../../../utils/result";
import { notFound } from "../../../utils/failures";
import { canUpdatePostComment } from "../../../logic/authorization/posts/canUpdatePostComment";
import type { GetCallingUser } from "../../users/types/calling-user";
import { PostCommentSchema, type PostComment } from "../types/post-comment";

export const UpdatePostCommentMutationInputSchema = PostCommentSchema.pick({ id: true, content: true });

export type UpdatePostCommentMutationInput = z.infer<typeof UpdatePostCommentMutationInputSchema>;

export const UpdatePostCommentMutationOutputSchema = PostCommentSchema;

export type UpdatePostCommentMutationOutput = z.infer<typeof UpdatePostCommentMutationOutputSchema>;

/** Changes a comment's content. */
export const updatePostCommentMutation: Mutation<{ input: UpdatePostCommentMutationInput, output: UpdatePostCommentMutationOutput }, {
    getCallingUser: GetCallingUser;
    getPostCommentById: (args: { id: string }) => Promise<PostComment | null>;
    updatePostComment: (args: { id: string; userId: string; content: string }) => Promise<PostComment | null>;
}> = async ({ input, dependencies }) => {
    const comment = await dependencies.getPostCommentById({ id: input.id });
    if (!comment) return notFound("Comment not found");

    const allowed = canUpdatePostComment(await dependencies.getCallingUser(), comment);
    if (!allowed.ok) return allowed;

    const updated = await dependencies.updatePostComment({ ...input, userId: allowed.value.userId });
    if (!updated) return notFound("Comment not found");
    return succeed(updated);
}

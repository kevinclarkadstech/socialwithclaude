import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { succeed } from "../../../utils/result";
import { notFound } from "../../../utils/failures";
import { canUpdatePostComment } from "../../../logic/authorization/posts/canUpdatePostComment";
import { logDisallowedResult } from "../../../logic/authorization/logDisallowedResult";
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
}> = async ({ input, context: { logger }, dependencies }) => {
    const comment = await dependencies.getPostCommentById({ id: input.id });
    if (!comment) {
        logger.info("Comment to update not found", { postCommentId: input.id });
        return notFound("Comment not found");
    }

    const caller = await dependencies.getCallingUser();
    const allowed = canUpdatePostComment(caller, comment);
    if (!allowed.ok) {
        logDisallowedResult(logger, allowed, { action: "update-post-comment", callerId: caller?.userId, postCommentId: comment.id });
        return allowed;
    }

    const updatedComment = await dependencies.updatePostComment({ ...input, userId: allowed.value.userId });
    if (!updatedComment) {
        logger.info("Comment deleted before it could be updated", { postCommentId: comment.id });
        return notFound("Comment not found");
    }

    return succeed(updatedComment);
}

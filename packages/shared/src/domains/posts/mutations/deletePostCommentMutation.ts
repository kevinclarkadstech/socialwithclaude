import z from "zod";
import type { Mutation } from "../../../types/mutation";
import { succeed } from "../../../utils/result";
import { notFound } from "../../../utils/failures";
import { canDeletePostComment } from "../../../logic/authorization/posts/canDeletePostComment";
import { logDisallowedResult } from "../../../logic/authorization/logDisallowedResult";
import type { GetCallingUser } from "../../users/types/calling-user";
import { PostCommentSchema, type PostComment } from "../types/post-comment";

export const DeletePostCommentMutationInputSchema = PostCommentSchema.pick({ id: true });

export type DeletePostCommentMutationInput = z.infer<typeof DeletePostCommentMutationInputSchema>;

export const DeletePostCommentMutationOutputSchema = z.undefined();

export type DeletePostCommentMutationOutput = z.infer<typeof DeletePostCommentMutationOutputSchema>;

export const deletePostCommentMutation: Mutation<{ input: DeletePostCommentMutationInput, output: DeletePostCommentMutationOutput }, {
    getCallingUser: GetCallingUser;
    getPostCommentById: (args: { id: string }) => Promise<PostComment | null>;
    deletePostComment: (args: { id: string; userId: string }) => Promise<boolean>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const comment = await dependencies.getPostCommentById({ id: input.id });
    if (!comment) {
        logger.info("Comment to delete not found", { postCommentId: input.id });
        return notFound("Comment not found");
    }

    const caller = await dependencies.getCallingUser();
    const allowed = canDeletePostComment(caller, comment);
    if (!allowed.ok) {
        logDisallowedResult(logger, allowed, { action: "delete-post-comment", callerId: caller?.userId, postCommentId: comment.id });
        return allowed;
    }

    await dependencies.deletePostComment({ id: comment.id, userId: allowed.value.userId });
    return succeed();
}

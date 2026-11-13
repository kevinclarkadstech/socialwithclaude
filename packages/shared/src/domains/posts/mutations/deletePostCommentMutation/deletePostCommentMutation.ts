import z from "zod";
import type { Mutation } from "../../../../types/mutation";
import { fail, succeed } from "../../../../utils/result";
import { notFoundError } from "../../../../error-handling";
import { canDeletePostComment } from "../../authorization/canDeletePostComment/canDeletePostComment";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../../users/types/calling-user";
import { PostCommentSchema, type PostCommentView } from "../../types/post-comment";

export const DeletePostCommentMutationInputSchema = PostCommentSchema.pick({ id: true });

export type DeletePostCommentMutationInput = z.infer<typeof DeletePostCommentMutationInputSchema>;

export const DeletePostCommentMutationOutputSchema = z.null();

export type DeletePostCommentMutationOutput = z.infer<typeof DeletePostCommentMutationOutputSchema>;

export const deletePostCommentMutation: Mutation<{ input: DeletePostCommentMutationInput, output: DeletePostCommentMutationOutput }, {
    getCallingUser: GetCallingUser;
    getPostCommentViewById: (args: { id: string; viewerId: string | null }) => Promise<PostCommentView | null>;
    deletePostComment: (args: { id: string; userId: string }) => Promise<boolean>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const comment = await dependencies.getPostCommentViewById({ id: input.id, viewerId: caller?.userId ?? null });
    if (!comment) {
        logger.info("Comment to delete not found", { postCommentId: input.id });
        return fail(notFoundError("Comment not found"));
    }

    const allowed = canDeletePostComment({ caller, comment });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "delete-post-comment", callerId: caller?.userId, postCommentId: comment.id },
        });
        return allowed;
    }

    await dependencies.deletePostComment({ id: comment.id, userId: allowed.value.userId });
    return succeed();
}

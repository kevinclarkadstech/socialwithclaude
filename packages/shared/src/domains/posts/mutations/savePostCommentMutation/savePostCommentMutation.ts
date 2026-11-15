import z from "zod";
import type { Mutation } from "../../../../types/mutation";
import { fail, succeed } from "../../../../utils/result";
import { notFoundError } from "../../../../error-handling";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../../users/types/calling-user";
import type { PostView } from "../../types/post";
import { PostCommentSchema, type PostCommentView } from "../../types/post-comment";
import { canSavePostComment } from "../../authorization/canSavePostComment/canSavePostComment";

export const SavePostCommentMutationInputSchema = z.object({
    postCommentId: PostCommentSchema.shape.id,
});

export type SavePostCommentMutationInput = z.infer<typeof SavePostCommentMutationInputSchema>;

export const SavePostCommentMutationOutputSchema = z.null();

export type SavePostCommentMutationOutput = z.infer<typeof SavePostCommentMutationOutputSchema>;

/** Saves a comment on a post the caller can see. Saving again succeeds. */
export const savePostCommentMutation: Mutation<{ input: SavePostCommentMutationInput, output: SavePostCommentMutationOutput }, {
    getCallingUser: GetCallingUser;
    getPostCommentViewById: (args: { id: string; viewerId: string | null }) => Promise<PostCommentView | null>;
    getPostViewById: (args: { id: string; viewerId: string | null }) => Promise<PostView | null>;
    savePostComment: (args: { userId: string; postCommentId: string }) => Promise<boolean>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const viewerId = caller?.userId ?? null;
    const comment = await dependencies.getPostCommentViewById({ id: input.postCommentId, viewerId });
    const post = comment ? await dependencies.getPostViewById({ id: comment.postId, viewerId }) : null;
    if (!comment || !post) {
        logger.info("Comment to save not found", { postCommentId: input.postCommentId });
        return fail(notFoundError("Comment not found"));
    }

    const allowed = canSavePostComment({ caller, post });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "save-post-comment", callerId: caller?.userId, postCommentId: comment.id, postId: post.id },
        });
        return allowed;
    }

    await dependencies.savePostComment({ userId: allowed.value.userId, postCommentId: comment.id });
    return succeed();
};

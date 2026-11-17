import z from "zod";
import type { Mutation } from "../../../../types/mutation";
import { fail, succeed } from "../../../../utils/result";
import { notFoundError } from "../../../../error-handling";
import { canUpdatePostComment } from "../../authorization/canUpdatePostComment/canUpdatePostComment";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../../users/types/calling-user";
import { PostCommentSchema, PostCommentViewSchema, type PostCommentView } from "../../types/post-comment";
import { bestEffort } from "../../../../utils/bestEffort/bestEffort";
import { newlyMentionedUsernames } from "../../../notifications/utils/mentionedUsernames/mentionedUsernames";

export const UpdatePostCommentMutationInputSchema = PostCommentSchema.pick({ id: true, content: true });

export type UpdatePostCommentMutationInput = z.infer<typeof UpdatePostCommentMutationInputSchema>;

export const UpdatePostCommentMutationOutputSchema = PostCommentViewSchema;

export type UpdatePostCommentMutationOutput = z.infer<typeof UpdatePostCommentMutationOutputSchema>;

/** Changes a comment's content. */
export const updatePostCommentMutation: Mutation<{ input: UpdatePostCommentMutationInput, output: UpdatePostCommentMutationOutput }, {
    getCallingUser: GetCallingUser;
    getPostCommentViewById: (args: { id: string; viewerId: string | null }) => Promise<PostCommentView | null>;
    updatePostComment: (args: { id: string; userId: string; content: string }) => Promise<PostCommentView | null>;
    /**
     * Notifies the people @-mentioned (by username) in a post or a comment on it
     * who can see the post (see mentionRecipients), except `excludedUserIds`.
     */
    notifyMentions: (args: { actorId: string; postId: string; postCommentId: string | null; usernames: string[]; excludedUserIds: string[] }) => Promise<void>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const comment = await dependencies.getPostCommentViewById({ id: input.id, viewerId: caller?.userId ?? null });
    if (!comment) {
        logger.info("Comment to update not found", { postCommentId: input.id });
        return fail(notFoundError("Comment not found"));
    }

    const allowed = canUpdatePostComment({ caller, comment });
    if (!allowed.ok) {
        logDisallowedResult({
            logger,
            result: allowed,
            details: { action: "update-post-comment", callerId: caller?.userId, postCommentId: comment.id },
        });
        return allowed;
    }

    const updatedComment = await dependencies.updatePostComment({ ...input, userId: allowed.value.userId });
    if (!updatedComment) {
        logger.info("Comment deleted before it could be updated", { postCommentId: comment.id });
        return fail(notFoundError("Comment not found"));
    }

    // Only people the edit newly mentions are told.
    const usernames = newlyMentionedUsernames({ before: comment.content, after: updatedComment.content });
    if (usernames.length > 0) {
        await bestEffort({
            logger,
            what: "send mention notifications",
            run: () => dependencies.notifyMentions({ actorId: allowed.value.userId, postId: comment.postId, postCommentId: comment.id, usernames, excludedUserIds: [] }),
        });
    }
    return succeed(updatedComment);
}

import z from "zod";
import type { Mutation } from "../../../../types/mutation";
import { fail, succeed } from "../../../../utils/result";
import { notFoundError, validationError } from "../../../../error-handling";
import { canUpdatePostComment } from "../../authorization/canUpdatePostComment/canUpdatePostComment";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import type { GetCallingUser } from "../../../users/types/calling-user";
import { PostCommentSchema, PostCommentViewSchema, type PostCommentView } from "../../types/post-comment";
import { bestEffort } from "../../../../utils/bestEffort/bestEffort";
import { newlyMentionedUsernames, noLongerMentionedUsernames } from "../../../notifications/utils/mentionedUsernames/mentionedUsernames";
import { PostCommentPhotoInputSchema, type PostCommentPhoto } from "../../types/post-comment-photo";
import { cleanUpAfterSave } from "../../utils/cleanUpAfterSave/cleanUpAfterSave";
import { postCommentPhotoKeys } from "../../utils/postCommentPhotoKeys/postCommentPhotoKeys";

export const UpdatePostCommentMutationInputSchema = PostCommentSchema.pick({ id: true, content: true }).extend({
    // Left out: keep the photo. Null: remove it. A photo (uploaded first): add it, or replace the one there.
    photo: PostCommentPhotoInputSchema.nullish(),
});

export type UpdatePostCommentMutationInput = z.infer<typeof UpdatePostCommentMutationInputSchema>;

export const UpdatePostCommentMutationOutputSchema = PostCommentViewSchema;

export type UpdatePostCommentMutationOutput = z.infer<typeof UpdatePostCommentMutationOutputSchema>;

/**
 * Changes a comment's text, and adds, replaces or removes its photo. A
 * photo taken off has its files deleted. It can't end up with neither text
 * nor a photo.
 */
export const updatePostCommentMutation: Mutation<{ input: UpdatePostCommentMutationInput, output: UpdatePostCommentMutationOutput }, {
    getCallingUser: GetCallingUser;
    getPostCommentViewById: (args: { id: string; viewerId: string | null }) => Promise<PostCommentView | null>;
    /** Saves the text, and the photo: undefined keeps it, null removes it, a photo replaces it. Null if the comment was deleted. */
    updatePostComment: (args: {
        id: string;
        userId: string;
        content: string;
        photo?: Pick<PostCommentPhoto, "id" | "width" | "height" | "placeholder"> | null;
    }) => Promise<PostCommentView | null>;
    /** Publishes the photo uploaded for a comment; null if it isn't usable. Safe to run again. */
    publishPostCommentPhoto: (args: { userId: string; postCommentId: string; photoId: string }) => Promise<{ id: string; width: number; height: number } | null>;
    /** Deletes the uploads of a comment's photo, once the comment is saved. */
    deletePostCommentPhotoUploads: (args: { userId: string; postCommentId: string; photoIds: string[] }) => Promise<void>;
    /** Deletes published photo files. */
    deleteMedia: (args: { keys: string[] }) => Promise<void>;
    /**
     * Notifies the people @-mentioned (by username) in a post or a comment on it
     * who can see the post (see mentionRecipients), except `excludedUserIds`.
     */
    notifyMentions: (args: { actorId: string; postId: string; postCommentId: string | null; usernames: string[]; excludedUserIds: string[] }) => Promise<void>;
    /** Takes back the mention notifications sent to the people with these usernames: the edit took their mention out. */
    retractMentions: (args: { postId: string; postCommentId: string | null; usernames: string[] }) => Promise<void>;
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

    const userId = allowed.value.userId;
    // A new photo (not the one already there) is published first.
    const isNewPhoto = input.photo && input.photo.id !== comment.photo?.id;
    let photo: Pick<PostCommentPhoto, "id" | "width" | "height" | "placeholder"> | null | undefined = input.photo === null ? null : undefined;
    if (input.photo && isNewPhoto) {
        const published = await dependencies.publishPostCommentPhoto({ userId, postCommentId: comment.id, photoId: input.photo.id });
        if (!published) {
            return fail(validationError("That photo couldn't be used. Try another one."));
        }
        photo = { ...published, placeholder: input.photo.placeholder };
    }
    const keepsPhoto = photo === undefined ? comment.photo !== null : photo !== null;
    if (!input.content && !keepsPhoto) {
        return fail(validationError("Write something or add a photo"));
    }

    const updatedComment = await dependencies.updatePostComment({ id: comment.id, content: input.content, userId, photo });
    if (!updatedComment) {
        logger.info("Comment deleted before it could be updated", { postCommentId: comment.id });
        return fail(notFoundError("Comment not found"));
    }

    // A photo taken off (removed or replaced) is gone for good; a new one's uploads aren't needed any more.
    const oldPhoto = comment.photo;
    if (oldPhoto && photo !== undefined) {
        await cleanUpAfterSave({
            logger,
            level: "error",
            what: "removed comment photo",
            postId: comment.postId,
            run: () => dependencies.deleteMedia({ keys: postCommentPhotoKeys(oldPhoto) }),
        });
    }
    if (input.photo && isNewPhoto) {
        const photoId = input.photo.id;
        await cleanUpAfterSave({
            logger,
            level: "warn",
            what: "comment photo upload",
            postId: comment.postId,
            run: () => dependencies.deletePostCommentPhotoUploads({ userId, postCommentId: comment.id, photoIds: [photoId] }),
        });
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
    // People the edit took out stop seeing the mention.
    const unmentioned = noLongerMentionedUsernames({ before: comment.content, after: updatedComment.content });
    if (unmentioned.length > 0) {
        await bestEffort({
            logger,
            what: "take back mention notifications",
            run: () => dependencies.retractMentions({ postId: comment.postId, postCommentId: comment.id, usernames: unmentioned }),
        });
    }
    return succeed(updatedComment);
}

import { canDeletePostComment, canUpdatePostComment, type CallingUser, type PostCommentView } from '@myapp/shared/domains';
import { askForReport } from '../../../../common/prompts/askForReport';
import { errorMessage } from '../../../../lib/api/errors';
import { askForText, confirm, showMenu } from '../../../../lib/prompts';
import { pickPhotoFile } from '../../../../lib/photos/pickPhotoFile';
import { showErrorToast, showToast } from '../../../../lib/toasts';
import { deletePostComment } from '../../actions/deletePostComment/deletePostComment';
import { reportPostComment } from '../../actions/reportPostComment/reportPostComment';
import { updatePostComment } from '../../actions/updatePostComment/updatePostComment';
import { uploadCommentPhoto } from '../../actions/uploadCommentPhoto/uploadCommentPhoto';
import { preparePostPhoto } from '../../utils/preparePostPhoto/preparePostPhoto';

async function edit(comment: PostCommentView) {
  const content = await askForText({ header: 'Edit comment', value: comment.content, confirmText: 'Save' });
  // Empty is only allowed with a photo (askForText gives null for both empty and cancel).
  if (content === null || content === comment.content) {
    return;
  }
  await updatePostComment({ id: comment.id, content });
}

/** Adds or replaces a comment's photo with one picked now (the picker opens from the menu's tap). */
async function changePhoto(comment: PostCommentView, picking: Promise<File | null>) {
  const file = await picking;
  if (!file) {
    return;
  }
  try {
    const photo = await preparePostPhoto(file);
    void showToast('Uploading photo…');
    const uploaded = await uploadCommentPhoto({ postId: comment.postId, postCommentId: comment.id, photo });
    if (!uploaded.ok) {
      throw new Error(uploaded.error.message ?? "That photo didn't upload");
    }
    await updatePostComment({ id: comment.id, content: comment.content, photo });
  } catch (error) {
    void showErrorToast(errorMessage(error));
  }
}

async function removePhoto(comment: PostCommentView) {
  const confirmed = await confirm({ header: 'Remove the photo?', message: "It's deleted from the comment.", confirmText: 'Remove' });
  if (confirmed) {
    await updatePostComment({ id: comment.id, content: comment.content, photo: null });
  }
}

async function remove(comment: PostCommentView) {
  const confirmed = await confirm({ header: 'Delete this comment?', message: "This can't be undone.", confirmText: 'Delete' });
  if (!confirmed) {
    return;
  }
  await deletePostComment(comment);
}

async function report(comment: PostCommentView) {
  const answer = await askForReport();
  if (answer === null) {
    return;
  }
  await reportPostComment({ postCommentId: comment.id, ...answer });
}

/**
 * A comment's "more" menu: edit, add or change its photo, remove its photo
 * and delete for your own comments; report for everyone else's. What's
 * offered comes from the same can* checks the API enforces.
 */
export async function openCommentMenu({ comment, callingUser }: { comment: PostCommentView; callingUser: CallingUser | null }) {
  const canEdit = canUpdatePostComment({ caller: callingUser, comment }).ok;
  const canDelete = canDeletePostComment({ caller: callingUser, comment }).ok;
  await showMenu({
    options: [
      ...(canEdit ? [{ text: 'Edit', onSelect: () => void edit(comment) }] : []),
      // The picker has to open within the tap itself, so it starts here.
      ...(canEdit ? [{ text: comment.photo ? 'Change photo' : 'Add photo', onSelect: () => void changePhoto(comment, pickPhotoFile()) }] : []),
      // Only when there's text to keep: a comment can't end up empty.
      ...(canEdit && comment.photo && comment.content ? [{ text: 'Remove photo', onSelect: () => void removePhoto(comment) }] : []),
      ...(canDelete ? [{ text: 'Delete', role: 'destructive' as const, onSelect: () => void remove(comment) }] : []),
      ...(!canEdit ? [{ text: 'Report', onSelect: () => void report(comment) }] : []),
    ],
  });
}

import type { CallingUser, PostComment } from '@myapp/shared/domains';
import { canDeletePostComment, canUpdatePostComment } from '@myapp/shared/logic/authorization';
import { askForReport } from '../../../../common/prompts/askForReport';
import { askForText, chooseFrom, confirm } from '../../../../lib/prompts';
import { deletePostComment } from '../../actions/deletePostComment';
import { reportPostComment } from '../../actions/reportPostComment';
import { updatePostComment } from '../../actions/updatePostComment';

async function edit(comment: PostComment) {
  const content = await askForText({ header: 'Edit comment', value: comment.content, confirmText: 'Save' });
  if (content === null || content === comment.content) {
    return;
  }
  await updatePostComment({ id: comment.id, content });
}

async function remove(comment: PostComment) {
  const confirmed = await confirm({ header: 'Delete this comment?', message: "This can't be undone.", confirmText: 'Delete' });
  if (!confirmed) {
    return;
  }
  await deletePostComment(comment);
}

async function report(comment: PostComment) {
  const answer = await askForReport();
  if (answer === null) {
    return;
  }
  await reportPostComment({ postCommentId: comment.id, ...answer });
}

/**
 * A comment's "more" menu: edit and delete for your own comments, report for
 * everyone else's. What's offered comes from the same can* checks the API enforces.
 */
export async function openCommentMenu({ comment, callingUser }: { comment: PostComment; callingUser: CallingUser | null }) {
  const canEdit = canUpdatePostComment({ caller: callingUser, comment }).ok;
  const canDelete = canDeletePostComment({ caller: callingUser, comment }).ok;
  const choice = await chooseFrom({
    options: [
      ...(canEdit ? [{ text: 'Edit', value: 'edit' as const }] : []),
      ...(canDelete ? [{ text: 'Delete', value: 'delete' as const, role: 'destructive' as const }] : []),
      ...(!canEdit ? [{ text: 'Report', value: 'report' as const }] : []),
    ],
  });
  if (choice === 'edit') {
    await edit(comment);
  }
  if (choice === 'delete') {
    await remove(comment);
  }
  if (choice === 'report') {
    await report(comment);
  }
}

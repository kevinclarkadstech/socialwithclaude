import { canDeletePost, canReportPost, canUpdatePost, type PostView } from '@myapp/shared/domains';
import { useState } from 'react';
import { askForReport } from '../../../../common/prompts/askForReport';
import { disallowedActions } from '../../../../common/events/disallowedActions/disallowedActions';
import { chooseFrom, confirm } from '../../../../lib/prompts';
import { useCallingUser } from '../../../users';
import { deletePost } from '../../actions/deletePost/deletePost';
import { reportPost } from '../../actions/reportPost/reportPost';

/**
 * A post's "more" menu: edit and delete for your own posts, report for
 * everyone else's. What's offered comes from the same can* checks the API
 * enforces.
 */
export function usePostMenuButton({ post, onDeleted }: { post: PostView; onDeleted?: () => void }) {
  const { callingUser } = useCallingUser();
  const [isEditing, setIsEditing] = useState(false);

  const canEdit = canUpdatePost({ caller: callingUser, post }).ok;
  const canDelete = canDeletePost({ caller: callingUser, post }).ok;
  const reportCheck = canReportPost({ caller: callingUser, post });

  async function removePost() {
    const confirmed = await confirm({
      header: 'Delete this post?',
      message: "It'll be removed for everyone. This can't be undone.",
      confirmText: 'Delete',
    });
    if (!confirmed) {
      return;
    }
    const result = await deletePost({ id: post.id });
    if (result.ok) {
      onDeleted?.();
    }
  }

  async function report() {
    const answer = await askForReport();
    if (answer === null) {
      return;
    }
    await reportPost({ postId: post.id, ...answer });
  }

  async function openMenu() {
    const choice = await chooseFrom({
      options: [
        ...(canEdit ? [{ text: 'Edit', value: 'edit' as const }] : []),
        ...(canDelete ? [{ text: 'Delete', value: 'delete' as const, role: 'destructive' as const }] : []),
        ...(!canEdit ? [{ text: 'Report', value: 'report' as const }] : []),
      ],
    });
    if (choice === 'edit') {
      setIsEditing(true);
    }
    if (choice === 'delete') {
      await removePost();
    }
    if (choice === 'report') {
      if (!reportCheck.ok) {
        disallowedActions.emit({ error: reportCheck.error, action: () => void report() });
        return;
      }
      await report();
    }
  }

  return { openMenu, isEditing, stopEditing: () => setIsEditing(false) };
}

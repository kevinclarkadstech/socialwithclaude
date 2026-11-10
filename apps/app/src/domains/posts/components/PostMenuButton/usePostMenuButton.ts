import type { PostView } from '@myapp/shared/domains';
import { canDeletePost, canUpdatePost } from '@myapp/shared/logic/authorization';
import { useState } from 'react';
import { askForReport } from '../../../../common/prompts/askForReport';
import { useRequireSignIn } from '../../../../common/hooks/useRequireSignIn';
import { chooseFrom, confirm } from '../../../../lib/prompts';
import { useCallingUser } from '../../../users/hooks/useCallingUser';
import { deletePost } from '../../actions/deletePost';
import { reportPost } from '../../actions/reportPost';

/**
 * A post's "more" menu: edit and delete for your own posts, report for
 * everyone else's. What's offered comes from the same can* checks the API
 * enforces.
 */
export function usePostMenuButton({ post, onDeleted }: { post: PostView; onDeleted?: () => void }) {
  const { callingUser } = useCallingUser();
  const requireSignIn = useRequireSignIn();
  const [isEditing, setIsEditing] = useState(false);

  const canEdit = canUpdatePost({ caller: callingUser, post }).ok;
  const canDelete = canDeletePost({ caller: callingUser, post }).ok;

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
      requireSignIn(() => void report());
    }
  }

  return { openMenu, isEditing, stopEditing: () => setIsEditing(false) };
}

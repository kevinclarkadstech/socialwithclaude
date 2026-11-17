import { runOrToast } from '../../../../lib/api/runOrToast';
import { postCommentStore } from '../../postCommentStore';
import { runUpdatePostCommentMutation } from '../../operations/runUpdatePostCommentMutation/runUpdatePostCommentMutation';
import type { PreparedPostPhoto } from '../../utils/preparePostPhoto/preparePostPhoto';

/**
 * Saves an edit to one of your comments: its text, and its photo (left out:
 * keep it; null: remove it; a new one, already uploaded: replace it). A failure has been shown in a toast.
 */
export async function updatePostComment({ id, content, photo }: { id: string; content: string; photo?: PreparedPostPhoto | null }) {
  const result = await runOrToast(() => runUpdatePostCommentMutation({ id, content, photo }));
  if (result.ok) {
    postCommentStore.setItems([result.value]);
  }
  return result;
}

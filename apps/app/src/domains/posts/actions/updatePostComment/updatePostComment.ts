import { runOrToast } from '../../../../lib/api/runOrToast';
import { postCommentStore } from '../../postCommentStore';
import { runUpdatePostCommentMutation } from '../../operations/runUpdatePostCommentMutation/runUpdatePostCommentMutation';

/** Saves an edit to one of your comments. A failure has been shown in a toast. */
export async function updatePostComment({ id, content }: { id: string; content: string }) {
  const result = await runOrToast(() => runUpdatePostCommentMutation({ id, content }));
  if (result.ok) {
    postCommentStore.setItems([result.value]);
  }
  return result;
}

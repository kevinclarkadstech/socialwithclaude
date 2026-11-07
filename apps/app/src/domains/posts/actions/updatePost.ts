import { runOrToast } from '../../../lib/api/runOrToast';
import { postStore } from '../postStore';
import { runUpdatePostMutation } from '../operations/runUpdatePostMutation';

/** Saves an edit to one of your posts. A failure has been shown in a toast. */
export async function updatePost({ id, content }: { id: string; content: string }) {
  const result = await runOrToast(() => runUpdatePostMutation({ id, content }));
  if (result.ok) {
    postStore.setItems([result.value]);
  }
  return result;
}

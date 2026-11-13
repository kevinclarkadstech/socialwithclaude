import { runOrToast } from '../../../../lib/api/runOrToast';
import { postStore } from '../../postStore';
import { runDeletePostMutation } from '../../operations/runDeletePostMutation/runDeletePostMutation';

/** Deletes one of your posts, everywhere it's shown. A failure has been shown in a toast. */
export async function deletePost({ id }: { id: string }) {
  const result = await runOrToast(() => runDeletePostMutation({ id }));
  if (result.ok) {
    postStore.removeItem(id);
  }
  return result;
}

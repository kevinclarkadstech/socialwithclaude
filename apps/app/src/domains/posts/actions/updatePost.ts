import type { PostMedia } from '@myapp/shared/domains';
import { runOrToast } from '../../../lib/api/runOrToast';
import { postStore } from '../postStore';
import { runUpdatePostMutation } from '../operations/runUpdatePostMutation';

/** Saves an edit to one of your posts: its text and photos. A failure has been shown in a toast. */
export async function updatePost({ id, content, media }: { id: string; content: string; media: PostMedia[] }) {
  const result = await runOrToast(() => runUpdatePostMutation({ id, content, media }));
  if (result.ok) {
    postStore.setItems([result.value]);
  }
  return result;
}

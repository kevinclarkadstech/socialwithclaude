import type { PostMediaChoice } from '@myapp/shared/domains';
import { newId } from '../../../lib/ids';
import { runOrToast } from '../../../lib/api/runOrToast';
import { emitPostCreated } from '../postEvents';
import { postStore } from '../postStore';
import { runCreatePostMutation } from '../operations/runCreatePostMutation';

/** Writes a new post (text, photos or both) and adds it to the feed. A failure has been shown in a toast. */
export async function createPost({ content, media }: { content: string; media: PostMediaChoice[] }) {
  const result = await runOrToast(() => runCreatePostMutation({ id: newId(), content, media }));
  if (result.ok) {
    postStore.setItems([result.value]);
    emitPostCreated(result.value);
  }
  return result;
}

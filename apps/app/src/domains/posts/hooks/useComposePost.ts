import type { Post } from '@myapp/shared/domains';
import { useState } from 'react';
import { runOrToast } from '../../../lib/api/runOrToast';
import { publishPost } from '../actions/publishPost';
import { updatePost } from '../actions/updatePost';
import { uploadPostPhotos } from '../actions/uploadPostPhotos';
import { usePostPhotos } from './usePostPhotos';

/**
 * Writing a new post, or editing `post`: the text as typed, its photos, and
 * saving them. A post needs text or a photo. A new post is sent in the
 * background (it shows at the top of the feed straight away); an edit
 * uploads any new photos, then saves, before closing. The text is trimmed
 * only when it's sent, so spaces and new lines can be typed.
 */
export function useComposePost({ post, onDismiss }: { post?: Post; onDismiss: () => void }) {
  const [content, setContent] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const photos = usePostPhotos();
  const hasSomething = content.trim() !== '' || photos.choices.length > 0;
  const isChanged = !post || content.trim() !== post.content || photos.isChanged;
  const canSubmit = !isBusy && !photos.isPreparing && !photos.hasFailed && hasSomething && isChanged;

  /** Starts from the post's text and photos when editing, or empty for a new post. */
  function reset() {
    setContent(post?.content ?? '');
    photos.reset(post?.media);
  }

  async function submit() {
    if (!post) {
      publishPost({ content: { kind: 'post', content: content.trim() }, photos: photos.handOff() });
      onDismiss();
      return;
    }
    setIsBusy(true);
    try {
      const uploaded = await runOrToast(() => uploadPostPhotos({ photos: photos.newPhotos }));
      if (!uploaded.ok) {
        return;
      }
      const result = await updatePost({ id: post.id, content: content.trim(), media: photos.choices });
      if (result.ok) {
        onDismiss();
      }
    } finally {
      setIsBusy(false);
    }
  }

  return { content, setContent, photos, isBusy, canSubmit, reset, submit };
}

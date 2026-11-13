import type { PostView } from '@myapp/shared/domains';
import { useState } from 'react';
import { newId } from '../../../../lib/ids';
import { publishPost } from '../../actions/publishPost/publishPost';
import { updatePost } from '../../actions/updatePost/updatePost';
import { warnAboutDroppedPhotos } from '../../utils/droppedPhotosWarning/droppedPhotosWarning';
import { usePostPhotos } from '../usePostPhotos/usePostPhotos';

/**
 * Writing a new post, or editing `post`: the text as typed, its photos
 * (uploaded as they're picked), and saving. A post needs text or a photo.
 * A new post is sent in the background (it shows at the top of the feed
 * straight away); an edit saves before closing. The text is trimmed only
 * when it's sent, so spaces and new lines can be typed.
 */
export function useComposePost({ post, onDismiss }: { post?: PostView; onDismiss: () => void }) {
  const [postId, setPostId] = useState('');
  const [content, setContent] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const photos = usePostPhotos();
  const hasSomething = content.trim() !== '' || photos.media.length > 0;
  const isChanged = !post || content.trim() !== post.content || photos.isChanged;
  const canSubmit = !isBusy && !photos.isBusy && !photos.hasFailed && hasSomething && isChanged;

  /** Starts from the post's text and photos when editing, or empty (with a new id) for a new post. */
  function reset() {
    const id = post?.id ?? newId();
    setPostId(id);
    setContent(post?.content ?? '');
    photos.reset({ id, media: post?.media });
  }

  async function submit() {
    if (!post) {
      publishPost({ id: postId, content: { kind: 'post', content: content.trim() }, photos: photos.handOff() });
      onDismiss();
      return;
    }
    setIsBusy(true);
    try {
      const media = photos.media;
      const result = await updatePost({ id: post.id, content: content.trim(), media });
      if (result.ok) {
        warnAboutDroppedPhotos({ sent: media, saved: result.value });
        onDismiss();
      }
    } finally {
      setIsBusy(false);
    }
  }

  return { content, setContent, photos, isBusy, canSubmit, reset, submit };
}

import type { Post } from '@myapp/shared/domains';
import { useState } from 'react';
import { createPost } from '../actions/createPost';
import { updatePost } from '../actions/updatePost';
import { usePostPhotos } from './usePostPhotos';

/**
 * Writing a new post, or editing `post`: the text as typed, its photos, and
 * saving them. A post needs text or a photo; saving waits for photos still
 * uploading. The text is trimmed only when it's sent, so spaces and new
 * lines can be typed.
 */
export function useComposePost({ post, onDismiss }: { post?: Post; onDismiss: () => void }) {
  const [content, setContent] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const photos = usePostPhotos();
  const hasSomething = content.trim() !== '' || photos.choices.length > 0;
  const isChanged = !post || content.trim() !== post.content || photos.isChanged;
  const canSubmit = !isBusy && !photos.isUploading && !photos.hasFailed && hasSomething && isChanged;

  /** Starts from the post's text and photos when editing, or empty for a new post. */
  function reset() {
    setContent(post?.content ?? '');
    photos.reset(post?.media);
  }

  async function submit() {
    setIsBusy(true);
    try {
      const fields = { content: content.trim(), media: photos.choices };
      const result = post ? await updatePost({ ...fields, id: post.id }) : await createPost(fields);
      if (result.ok) {
        onDismiss();
      }
    } finally {
      setIsBusy(false);
    }
  }

  return { content, setContent, photos, canSubmit, reset, submit };
}

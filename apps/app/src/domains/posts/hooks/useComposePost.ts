import type { Post } from '@myapp/shared/domains';
import { useState } from 'react';
import { createPost } from '../actions/createPost';
import { updatePost } from '../actions/updatePost';

/**
 * Writing a new post, or editing `post`: the text as typed, and saving it.
 * The text is trimmed only when it's sent, so spaces and new lines can be typed.
 */
export function useComposePost({ post, onDismiss }: { post?: Post; onDismiss: () => void }) {
  const [content, setContent] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const canSubmit = !isBusy && content.trim() !== '' && content.trim() !== post?.content;

  /** Starts from the post's text when editing, or empty for a new post. */
  function reset() {
    setContent(post?.content ?? '');
  }

  async function submit() {
    setIsBusy(true);
    try {
      const result = post
        ? await updatePost({ id: post.id, content: content.trim() })
        : await createPost({ content: content.trim() });
      if (result.ok) {
        onDismiss();
      }
    } finally {
      setIsBusy(false);
    }
  }

  return { content, setContent, canSubmit, reset, submit };
}

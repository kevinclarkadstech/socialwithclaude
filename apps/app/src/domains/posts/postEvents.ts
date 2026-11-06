import type { Post } from '@myapp/shared/domains';

type Listener = (post: Post) => void;

const listeners = new Set<Listener>();

/**
 * A new post isn't in any list yet, and whether it belongs in one is that
 * list's decision (the feed shows it at the top; search ignores it), so
 * lists listen for it. Changes to existing posts go through postStore.
 */
export function onPostCreated(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitPostCreated(post: Post) {
  for (const listener of listeners) {
    listener(post);
  }
}

import { useSyncExternalStore } from 'react';
import { postCommentStore } from '../postCommentStore';

/** One comment from the store, re-rendering only when it changes. */
export function usePostComment(id: string) {
  return useSyncExternalStore(postCommentStore.subscribe, () => postCommentStore.getItem(id));
}

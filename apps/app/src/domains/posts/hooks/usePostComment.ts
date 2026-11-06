import { useSyncExternalStore } from 'react';
import { commentStore } from '../commentStore';

/** One comment from the store, re-rendering only when it changes. */
export function usePostComment(id: string) {
  return useSyncExternalStore(commentStore.subscribe, () => commentStore.getItem(id));
}

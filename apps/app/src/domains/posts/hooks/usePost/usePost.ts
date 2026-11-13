import { useSyncExternalStore } from 'react';
import { postStore } from '../../postStore';

/** One post from the store, re-rendering only when that post changes. */
export function usePost(id: string) {
  return useSyncExternalStore(postStore.subscribe, () => postStore.getItem(id));
}

import { useSyncExternalStore } from 'react';
import { pendingPostStore, type PendingPostContent } from '../pendingPostStore';

/** Posts being sent from this device, newest first; only listings with `kind` "listing". */
export function usePendingPosts(kind?: PendingPostContent['kind']) {
  const all = useSyncExternalStore(pendingPostStore.subscribe, pendingPostStore.getAll);
  return kind ? all.filter((post) => post.content.kind === kind) : all;
}

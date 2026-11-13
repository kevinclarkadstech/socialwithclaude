import type { CreatePostMutationInput } from '@myapp/shared/domains';
import type { PreparedPostPhoto } from './utils/preparePostPhoto/preparePostPhoto';

/** What's being posted: a post's text, or a listing's text (its description) and details. */
export type PendingPostContent =
  | { kind: 'post'; content: string }
  | { kind: 'listing'; content: string; listing: NonNullable<CreatePostMutationInput['listing']> };

/**
 * A post or listing being sent: shown at the top of the feed straight away
 * (with its photos from this device) while it's saved, then replaced by the
 * real post. A failed one stays, to retry or discard.
 */
export interface PendingPost {
  /** The post's id (made by the app when writing began, so sending again can't make a second post). */
  id: string;
  content: PendingPostContent;
  photos: { photo: PreparedPostPhoto; caption: string | null }[];
  status: 'sending' | 'failed';
  error: string | null;
}

let pendingPosts: PendingPost[] = [];
const listeners = new Set<() => void>();

function set(next: PendingPost[]) {
  pendingPosts = next;
  for (const listener of listeners) {
    listener();
  }
}

/** Posts and listings being sent from this device, newest first. */
export const pendingPostStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getAll: () => pendingPosts,
  get: (id: string) => pendingPosts.find((post) => post.id === id),
  add(post: PendingPost) {
    set([post, ...pendingPosts]);
  },
  update(id: string, change: Partial<PendingPost>) {
    set(pendingPosts.map((post) => (post.id === id ? { ...post, ...change } : post)));
  },
  remove(id: string) {
    set(pendingPosts.filter((post) => post.id !== id));
  },
};

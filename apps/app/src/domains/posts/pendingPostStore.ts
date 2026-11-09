import type { CreatePostListingMutationInput } from '@myapp/shared/domains';
import type { PreparedPostPhoto } from './utils/preparePostPhoto';

/** Omit for each kind of price in turn (a plain Omit would merge them and lose which fields go with which). */
type ListingFields = CreatePostListingMutationInput extends infer T ? (T extends unknown ? Omit<T, 'id' | 'media'> : never) : never;

/** What's being posted: a post's text, or a listing's details. */
export type PendingPostContent = { kind: 'post'; content: string } | { kind: 'listing'; listing: ListingFields };

/**
 * A post or listing being sent: shown at the top of the feed straight away
 * (with its photos from this device) while its photos upload and it's
 * created, then replaced by the real post. A failed one stays, to retry or discard.
 */
export interface PendingPost {
  /** The post's id once created (made here, so sending again can't make a second post). */
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

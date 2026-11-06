import type { Post } from '@myapp/shared/domains';

/** One list of posts (the feed, a profile's posts, search results...): ids only, in order. */
export interface PostList {
  ids: string[];
  nextCursor: string | null;
  /** False until the first page has loaded. */
  hasLoaded: boolean;
  isLoading: boolean;
  /** Why the first page failed to load, if it did. */
  error: unknown;
}

const emptyList: PostList = { ids: [], nextCursor: null, hasLoaded: false, isLoading: false, error: null };

let posts = new Map<string, Post>();
let lists = new Map<string, PostList>();
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Every post the app has loaded, stored once by id, and the lists that show
 * them. A change to a post (saving, voting, editing) replaces it here once,
 * and every list showing it updates. Objects are replaced, never mutated,
 * so components re-render only when what they read changes.
 */
export const postStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getPost: (id: string): Post | undefined => posts.get(id),
  getList: (key: string): PostList => lists.get(key) ?? emptyList,

  /** Adds or replaces posts; the newest copy from the API wins. */
  setPosts(loaded: Post[]) {
    if (loaded.length === 0) {
      return;
    }
    posts = new Map(posts);
    for (const post of loaded) {
      posts.set(post.id, post);
    }
    notify();
  },

  /** Changes one post. Returns the post as it was, to undo the change. */
  updatePost(id: string, update: (post: Post) => Post): Post | undefined {
    const previous = posts.get(id);
    if (!previous) {
      return undefined;
    }
    posts = new Map(posts).set(id, update(previous));
    notify();
    return previous;
  },

  /** Puts a post back as it was, e.g. when a change fails. */
  restorePost(post: Post) {
    posts = new Map(posts).set(post.id, post);
    notify();
  },

  updateList(key: string, update: (list: PostList) => PostList) {
    lists = new Map(lists).set(key, update(postStore.getList(key)));
    notify();
  },

  /** Forgets everything, e.g. on sign-in or sign-out, when what the viewer sees changes. */
  reset() {
    posts = new Map();
    lists = new Map();
    notify();
  },
};

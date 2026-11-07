import type { PostComment } from '@myapp/shared/domains';
import { createEntityStore } from '../../lib/stores/createEntityStore';

/** Every comment the app has loaded, once by id. Each post's comments are a list keyed by commentListKey. */
export const commentStore = createEntityStore<PostComment>();

export const commentListKey = (postId: string) => `post:${postId}`;

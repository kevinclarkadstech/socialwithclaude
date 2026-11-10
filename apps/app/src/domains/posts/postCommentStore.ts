import type { PostCommentView } from '@myapp/shared/domains';
import { createEntityStore } from '../../lib/stores/createEntityStore';

/** Every comment the app has loaded, once by id. Each post's comments are a list keyed by postCommentListKey. */
export const postCommentStore = createEntityStore<PostCommentView>();

export const postCommentListKey = (postId: string) => `post:${postId}`;

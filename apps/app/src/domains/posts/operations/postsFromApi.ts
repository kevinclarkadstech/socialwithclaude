import { api } from '../../../lib/api/trpc';
import { fromApi } from '../../../lib/api/results';
import { nullIfNotFound } from '../../../lib/api/errors';
import { withRetry } from '../../../lib/api/withRetry';
import { postCommentStore } from '../postCommentStore';
import { postStore } from '../postStore';

/** A post fresh from the API, or null if it doesn't exist or was deleted. */
export async function fetchPostById(id: string) {
  const found = await withRetry(() => nullIfNotFound(fromApi(api.posts.getPostById.query({ postId: id }))));
  return found?.post ?? null;
}

/** For mutations' getPostViewById and getPostById dependencies: the post as shown, else from the API. */
export async function postFromStoreOrApi({ id }: { id: string }) {
  return postStore.getItem(id) ?? fetchPostById(id);
}

/** For mutations' getPostMediaByPostId dependency: the post's photos as shown, else from the API. */
export async function mediaFromStoreOrApi({ postId }: { postId: string }) {
  const post = await postFromStoreOrApi({ id: postId });
  return post?.media ?? [];
}

/** For mutations' getPostCommentViewById dependency: only comments on screen get edited, voted on or reported. */
export async function commentFromStore({ id }: { id: string }) {
  return postCommentStore.getItem(id) ?? null;
}

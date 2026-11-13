import type { PostCommentView } from '@myapp/shared/domains';
import { runOrToast } from '../../../../lib/api/runOrToast';
import { postCommentStore } from '../../postCommentStore';
import { postStore } from '../../postStore';
import { runDeletePostCommentMutation } from '../../operations/runDeletePostCommentMutation/runDeletePostCommentMutation';

/** Deletes one of your comments and uncounts it on its post. A failure has been shown in a toast. */
export async function deletePostComment({ id, postId }: Pick<PostCommentView, 'id' | 'postId'>) {
  const result = await runOrToast(() => runDeletePostCommentMutation({ id }));
  if (result.ok) {
    postCommentStore.removeItem(id);
    postStore.updateItem(postId, (post) => ({ ...post, numComments: Math.max(0, post.numComments - 1) }));
  }
  return result;
}

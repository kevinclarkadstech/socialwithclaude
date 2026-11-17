import { runOrToast } from '../../../../lib/api/runOrToast';
import { postCommentListKey, postCommentStore } from '../../postCommentStore';
import { postStore } from '../../postStore';
import { runCreatePostCommentMutation } from '../../operations/runCreatePostCommentMutation/runCreatePostCommentMutation';
import type { PreparedPostPhoto } from '../../utils/preparePostPhoto/preparePostPhoto';

/**
 * Writes a comment (text, a photo already uploaded, or both), adds it to
 * the end of the post's comments and counts it everywhere the post is
 * shown. `id` is the one its photo was uploaded under. A failure has been shown in a toast.
 */
export async function createPostComment({ id, postId, content, photo }: { id: string; postId: string; content: string; photo: PreparedPostPhoto | null }) {
  const result = await runOrToast(() => runCreatePostCommentMutation({ id, postId, content, photo }));
  if (result.ok) {
    const comment = result.value;
    postCommentStore.setItems([comment]);
    postCommentStore.updateList(postCommentListKey(postId), (list) =>
      list.ids.includes(comment.id) ? list : { ...list, ids: [...list.ids, comment.id] },
    );
    postStore.updateItem(postId, (post) => ({ ...post, numComments: post.numComments + 1 }));
  }
  return result;
}

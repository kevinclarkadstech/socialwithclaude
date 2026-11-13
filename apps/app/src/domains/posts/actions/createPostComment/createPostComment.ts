import { newId } from '../../../../lib/ids';
import { runOrToast } from '../../../../lib/api/runOrToast';
import { postCommentListKey, postCommentStore } from '../../postCommentStore';
import { postStore } from '../../postStore';
import { runCreatePostCommentMutation } from '../../operations/runCreatePostCommentMutation/runCreatePostCommentMutation';

/**
 * Writes a comment, adds it to the end of the post's comments and counts it
 * everywhere the post is shown. A failure has been shown in a toast.
 */
export async function createPostComment({ postId, content }: { postId: string; content: string }) {
  const result = await runOrToast(() => runCreatePostCommentMutation({ id: newId(), postId, content }));
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

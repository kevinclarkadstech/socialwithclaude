import type { PostCommentVoteValue } from '@myapp/shared/domains';
import { runOrToast } from '../../../../lib/api/runOrToast';
import { withVote } from '../../commentVotes';
import { postCommentStore } from '../../postCommentStore';
import { runSetPostCommentVoteMutation } from '../../operations/runSetPostCommentVoteMutation/runSetPostCommentVoteMutation';

/**
 * Makes your vote on a comment `value` (null removes it). Shown right away,
 * and undone if it fails. A failure has been shown in a toast.
 */
export async function setPostCommentVote({ postCommentId, value }: { postCommentId: string; value: PostCommentVoteValue | null }) {
  const previous = postCommentStore.updateItem(postCommentId, (comment) => withVote(comment, value));
  const result = await runOrToast(() => runSetPostCommentVoteMutation({ postCommentId, value }));
  if (!result.ok && previous) {
    postCommentStore.restoreItem(previous);
  }
  return result;
}

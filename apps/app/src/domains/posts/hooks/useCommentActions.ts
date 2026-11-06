import type { PostComment, PostCommentVoteValue, ReportReason } from '@myapp/shared/domains';
import { nextVote, withVote } from '../commentVotes';
import { newId } from '../../../lib/ids';
import { showToast } from '../../../lib/toasts';
import { runOrToast } from '../../../lib/api/runOrToast';
import { commentListKey, commentStore } from '../commentStore';
import { postStore } from '../postStore';
import { runCreatePostCommentMutation } from '../operations/runCreatePostCommentMutation';
import { runDeletePostCommentMutation } from '../operations/runDeletePostCommentMutation';
import { runDeletePostCommentVoteMutation } from '../operations/runDeletePostCommentVoteMutation';
import { runReportPostCommentMutation } from '../operations/runReportPostCommentMutation';
import { runUpdatePostCommentMutation } from '../operations/runUpdatePostCommentMutation';
import { runVoteOnPostCommentMutation } from '../operations/runVoteOnPostCommentMutation';

/** Changes a post's comment count everywhere it's shown. */
function adjustCommentCount(postId: string, delta: 1 | -1) {
  postStore.updateItem(postId, (post) => ({ ...post, numComments: Math.max(0, post.numComments + delta) }));
}

/** Writing, editing, deleting, voting on and reporting comments. Each returns false (after a toast) if it fails. */
export function useCommentActions() {
  async function createComment(postId: string, content: string): Promise<boolean> {
    const outcome = await runOrToast(() => runCreatePostCommentMutation({ id: newId(), postId, content }));
    if (!outcome.ok) {
      return false;
    }
    const comment = outcome.value;
    commentStore.setItems([comment]);
    commentStore.updateList(commentListKey(postId), (list) =>
      list.ids.includes(comment.id) ? list : { ...list, ids: [...list.ids, comment.id] },
    );
    adjustCommentCount(postId, 1);
    return true;
  }

  async function updateComment(id: string, content: string): Promise<boolean> {
    const outcome = await runOrToast(() => runUpdatePostCommentMutation({ id, content }));
    if (!outcome.ok) {
      return false;
    }
    commentStore.setItems([outcome.value]);
    return true;
  }

  async function deleteComment(comment: PostComment): Promise<boolean> {
    const outcome = await runOrToast(() => runDeletePostCommentMutation({ id: comment.id }));
    if (!outcome.ok) {
      return false;
    }
    commentStore.removeItem(comment.id);
    adjustCommentCount(comment.postId, -1);
    return true;
  }

  /** Tapping the vote you already gave removes it; otherwise it becomes your vote. Shown right away, undone if it fails. */
  async function vote(comment: PostComment, value: PostCommentVoteValue): Promise<boolean> {
    const next = nextVote(comment.viewer.vote, value);
    const previous = commentStore.updateItem(comment.id, (current) => withVote(current, next));
    const outcome = await runOrToast<unknown>(() =>
      next === null
        ? runDeletePostCommentVoteMutation({ postCommentId: comment.id })
        : runVoteOnPostCommentMutation({ postCommentId: comment.id, value: next }),
    );
    if (!outcome.ok && previous) {
      commentStore.restoreItem(previous);
    }
    return outcome.ok;
  }

  async function reportComment(postCommentId: string, report: { reason: ReportReason; details: string | null }): Promise<boolean> {
    const outcome = await runOrToast(() => runReportPostCommentMutation({ id: newId(), postCommentId, ...report }));
    if (!outcome.ok) {
      return false;
    }
    void showToast("Thanks for the report. We'll take a look.");
    return true;
  }

  return { createComment, updateComment, deleteComment, vote, reportComment };
}

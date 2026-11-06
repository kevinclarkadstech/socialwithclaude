import type { ReportReason } from '@myapp/shared/domains';
import { newId } from '../../../lib/ids';
import { showToast } from '../../../lib/toasts';
import { runOrToast } from '../../../lib/api/runOrToast';
import { emitPostCreated } from '../postEvents';
import { postStore } from '../postStore';
import { runCreatePostMutation } from '../operations/runCreatePostMutation';
import { runDeletePostMutation } from '../operations/runDeletePostMutation';
import { runReportPostMutation } from '../operations/runReportPostMutation';
import { runUpdatePostMutation } from '../operations/runUpdatePostMutation';

/** Creating, editing, deleting and reporting posts. Each returns false (after a toast) if it fails. */
export function usePostActions() {
  async function createPost(content: string): Promise<boolean> {
    const outcome = await runOrToast(() => runCreatePostMutation({ id: newId(), content }));
    if (!outcome.ok) {
      return false;
    }
    postStore.setItems([outcome.value]);
    emitPostCreated(outcome.value);
    return true;
  }

  async function updatePost(id: string, content: string): Promise<boolean> {
    const outcome = await runOrToast(() => runUpdatePostMutation({ id, content }));
    if (!outcome.ok) {
      return false;
    }
    postStore.setItems([outcome.value]);
    return true;
  }

  async function deletePost(id: string): Promise<boolean> {
    const outcome = await runOrToast(() => runDeletePostMutation({ id }));
    if (!outcome.ok) {
      return false;
    }
    postStore.removeItem(id);
    return true;
  }

  async function reportPost(postId: string, report: { reason: ReportReason; details: string | null }): Promise<boolean> {
    const outcome = await runOrToast(() => runReportPostMutation({ id: newId(), postId, ...report }));
    if (!outcome.ok) {
      return false;
    }
    void showToast("Thanks for the report. We'll take a look.");
    return true;
  }

  return { createPost, updatePost, deletePost, reportPost };
}

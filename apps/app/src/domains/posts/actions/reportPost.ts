import type { ReportReason } from '@myapp/shared/domains';
import { newId } from '../../../lib/ids';
import { showToast } from '../../../lib/toasts';
import { runOrToast } from '../../../lib/api/runOrToast';
import { runReportPostMutation } from '../operations/runReportPostMutation';

/** Reports a post, then thanks you. A failure has been shown in a toast. */
export async function reportPost({ postId, reason, details }: { postId: string; reason: ReportReason; details: string | null }) {
  const result = await runOrToast(() => runReportPostMutation({ id: newId(), postId, reason, details }));
  if (result.ok) {
    void showToast("Thanks for the report. We'll take a look.");
  }
  return result;
}

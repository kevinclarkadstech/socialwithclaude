import type { ReportReason } from '@myapp/shared/domains';
import { newId } from '../../../../lib/ids';
import { showToast } from '../../../../lib/toasts';
import { runOrToast } from '../../../../lib/api/runOrToast';
import { runReportPostCommentMutation } from '../../operations/runReportPostCommentMutation/runReportPostCommentMutation';

/** Reports a comment, then thanks you. A failure has been shown in a toast. */
export async function reportPostComment({ postCommentId, reason, details }: {
  postCommentId: string;
  reason: ReportReason;
  details: string | null;
}) {
  const result = await runOrToast(() => runReportPostCommentMutation({ id: newId(), postCommentId, reason, details }));
  if (result.ok) {
    void showToast("Thanks for the report. We'll take a look.");
  }
  return result;
}

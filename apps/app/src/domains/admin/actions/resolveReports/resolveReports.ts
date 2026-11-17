import type { ReportOutcome, ReportedItem } from '@myapp/shared/domains';
import { runOrToast } from '../../../../lib/api/runOrToast';
import { confirm } from '../../../../lib/prompts';
import { showToast } from '../../../../lib/toasts';
import { runResolveReportsMutation } from '../../operations/runResolveReportsMutation/runResolveReportsMutation';
import { describeReportedItem } from '../../utils/describeReportedItem/describeReportedItem';

const done: Record<ReportOutcome, string> = {
  dismissed: 'Reports dismissed',
  removed: 'Removed',
  reviewed: 'Marked reviewed',
};

/**
 * Settles `item`'s open reports with `outcome`, asking first before
 * removing it. Resolves true if it went through; a failure has been shown in a toast.
 */
export async function resolveReports({ item, outcome }: { item: ReportedItem; outcome: ReportOutcome }) {
  if (outcome === 'removed') {
    const { noun } = describeReportedItem(item);
    const confirmed = await confirm({
      header: `Remove this ${noun}?`,
      message: "It's deleted for everyone and the reports are marked reviewed. This can't be undone.",
      confirmText: 'Remove',
    });
    if (!confirmed) {
      return false;
    }
  }
  const result = await runOrToast(() => runResolveReportsMutation({ kind: item.kind, targetId: item.targetId, outcome }));
  if (result.ok) {
    void showToast(done[outcome]);
  }
  return result.ok;
}

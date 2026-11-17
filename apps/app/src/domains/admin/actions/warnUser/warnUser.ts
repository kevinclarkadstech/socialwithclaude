import { reportReasons, type ReportReason, type ReportedItem } from '@myapp/shared/domains';
import { runOrToast } from '../../../../lib/api/runOrToast';
import { askForText, chooseFrom } from '../../../../lib/prompts';
import { showToast } from '../../../../lib/toasts';
import { reportReasonLabels } from '../../../../utils/formatters/reportReasons';
import { runWarnUserMutation } from '../../operations/runWarnUserMutation/runWarnUserMutation';
import { describeReportedItem } from '../../utils/describeReportedItem/describeReportedItem';
import { resolveReports } from '../resolveReports/resolveReports';

/**
 * Warns whoever `item` is by: pick what for (the reasons it was reported
 * for come first), add a note if you like, then optionally settle its
 * reports too. They get a warning notification with a default message.
 * Resolves true if the warning went out; a failure has been shown in a toast.
 */
export async function warnUser({ item }: { item: ReportedItem }) {
  const who = item.subject.username ? `@${item.subject.username}` : 'this person';
  const reported = [...new Set(item.reports.map((report) => report.reason))];
  const ordered: ReportReason[] = [...reported, ...reportReasons.filter((reason) => !reported.includes(reason))];
  const reason = await chooseFrom({
    header: `Warn ${who} for…`,
    options: ordered.map((value) => ({ text: reportReasonLabels[value], value })),
  });
  if (!reason) {
    return false;
  }
  const note = await askForText({ header: 'Add a note? (optional)', placeholder: 'Shown to them with the warning', confirmText: 'Send warning' });
  const result = await runOrToast(() => runWarnUserMutation({ userId: item.subject.userId, reason, note, kind: item.kind, targetId: item.targetId }));
  if (!result.ok) {
    return false;
  }
  void showToast(`Warned ${who}`);

  if (item.isOpen) {
    const { noun } = describeReportedItem(item);
    const next = await chooseFrom({
      header: 'And the reports?',
      options: [
        ...(item.kind !== 'profile' ? [{ text: `Remove the ${noun} too`, value: 'removed' as const, role: 'destructive' as const }] : []),
        { text: 'Mark reviewed', value: 'reviewed' as const },
        { text: 'Leave open', value: 'open' as const },
      ],
    });
    if (next === 'removed' || next === 'reviewed') {
      await resolveReports({ item, outcome: next });
    }
  }
  return true;
}

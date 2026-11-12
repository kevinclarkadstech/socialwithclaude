import { reportReasons, type ReportReason } from '@myapp/shared/domains';
import { askForText, chooseFrom } from '../../lib/prompts';
import { reportReasonLabels } from '../../utils/formatters/reportReasons';

/** "Report": a reason, plus a few words for "Something else". Resolves null if cancelled. */
export async function askForReport(): Promise<{ reason: ReportReason; details: string | null } | null> {
  const reason = await chooseFrom({
    header: 'Why are you reporting this?',
    options: reportReasons.map((value) => ({ text: reportReasonLabels[value], value })),
  });
  if (reason === null) {
    return null;
  }
  if (reason !== 'other') {
    return { reason, details: null };
  }
  const details = await askForText({ header: 'What’s wrong?', placeholder: 'Tell us more', confirmText: 'Report' });
  if (details === null) {
    return null;
  }
  return { reason, details };
}

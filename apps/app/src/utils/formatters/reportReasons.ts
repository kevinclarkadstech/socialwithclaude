import type { ReportReason } from '@myapp/shared/domains';

/** How each report reason reads in the "Report" menu. */
export const reportReasonLabels: Record<ReportReason, string> = {
  spam: 'Spam',
  harassment: 'Harassment or bullying',
  hate: 'Hate speech',
  violence: 'Violence or threats',
  sexual_content: 'Sexual content',
  child_safety: 'Child safety',
  impersonation: 'Pretending to be someone else',
  scam: 'Scam or fraud',
  prohibited_item: 'Prohibited item',
  other: 'Something else',
};

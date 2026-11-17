import type { Notification, ReportKind } from '@myapp/shared/domains';
import { reportReasonLabels } from '../../../../utils/formatters/reportReasons';

const things: Record<ReportKind, string> = {
  post: 'post',
  postComment: 'comment',
  profile: 'profile',
  chatMessage: 'message',
};

/**
 * A notification's default wording: a short title and the message. Words
 * live here rather than in what's stored, so they can change without
 * touching anyone's notifications.
 */
export function describeNotification(notification: Notification): { title: string; message: string } {
  if (notification.type === 'warning') {
    const { reason, note, kind } = notification.data;
    const about = kind ? `Your ${things[kind]} went against our community guidelines` : 'Something you did went against our community guidelines';
    return {
      title: 'Warning from our team',
      message: [
        `${about} (${reportReasonLabels[reason].toLowerCase()}).`,
        note,
        'Repeated problems can get your account banned.',
      ].filter(Boolean).join(' '),
    };
  }
  const { kind, outcome } = notification.data;
  const thing = things[kind];
  if (outcome === 'removed') {
    return { title: 'Your report', message: `We removed the ${thing} you reported. Thanks for helping keep the community safe.` };
  }
  if (outcome === 'reviewed') {
    return { title: 'Your report', message: `We reviewed the ${thing} you reported and took action. Thanks for letting us know.` };
  }
  return {
    title: 'Your report',
    message: `We reviewed the ${thing} you reported and it doesn't go against our community guidelines. You can always block someone you don't want to see.`,
  };
}

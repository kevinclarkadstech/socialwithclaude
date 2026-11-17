import type { NotificationView, ReportKind } from '@myapp/shared/domains';
import { reportReasonLabels } from '../../../../utils/formatters/reportReasons';

const things: Record<ReportKind, string> = {
  post: 'post',
  postComment: 'comment',
  profile: 'profile',
  chatMessage: 'message',
};

/** What tapping a notification opens: a path, or null for nothing (the app's own messages). */
export type NotificationTarget = string | null;

/**
 * A notification's default wording (a short title and the message) and what
 * tapping it opens. Words live here rather than in what's stored, so they
 * can change without touching anyone's notifications.
 */
export function describeNotification(notification: NotificationView): { title: string; message: string; target: NotificationTarget } {
  const who = notification.actor ? `@${notification.actor.username}` : 'Someone';
  const profile = notification.actor ? `/profile/${notification.actor.username}` : null;
  switch (notification.type) {
    case 'warning': {
      const { reason, note, kind } = notification.data;
      const about = kind ? `Your ${things[kind]} went against our community guidelines` : 'Something you did went against our community guidelines';
      return {
        title: 'Warning from our team',
        message: [`${about} (${reportReasonLabels[reason].toLowerCase()}).`, note, 'Repeated problems can get your account banned.'].filter(Boolean).join(' '),
        target: null,
      };
    }
    case 'report_resolved': {
      const { kind, outcome } = notification.data;
      const thing = things[kind];
      const message = {
        removed: `We removed the ${thing} you reported. Thanks for helping keep the community safe.`,
        reviewed: `We reviewed the ${thing} you reported and took action. Thanks for letting us know.`,
        dismissed: `We reviewed the ${thing} you reported and it doesn't go against our community guidelines. You can always block someone you don't want to see.`,
      }[outcome];
      return { title: 'Your report', message, target: null };
    }
    case 'followed':
      return { title: who, message: 'started following you.', target: profile };
    case 'follow_requested':
      // Requests are answered in Settings.
      return { title: who, message: 'asked to follow you.', target: '/settings' };
    case 'follow_accepted':
      return { title: who, message: 'accepted your follow request.', target: profile };
    case 'commented':
      return { title: who, message: `commented on your post: “${notification.data.excerpt}”`, target: `/feed/posts/${notification.data.postId}` };
    case 'mentioned':
      return {
        title: who,
        message: notification.data.postCommentId ? 'mentioned you in a comment.' : 'mentioned you in a post.',
        target: `/feed/posts/${notification.data.postId}`,
      };
  }
}

import type { ModerationSubject } from '@myapp/shared/domains';
import { runOrToast } from '../../../../lib/api/runOrToast';
import { askForText, chooseFrom, confirm } from '../../../../lib/prompts';
import { showToast } from '../../../../lib/toasts';
import { runBanUserMutation } from '../../operations/runBanUserMutation/runBanUserMutation';

const day = 24 * 60 * 60 * 1000;
const lengths = {
  '1d': { text: '1 day', ms: day },
  '7d': { text: '7 days', ms: 7 * day },
  '30d': { text: '30 days', ms: 30 * day },
  forever: { text: 'For good', ms: null },
} as const;

/**
 * Asks how long and why, confirms, then bans `subject`: they're signed out
 * everywhere and can't sign in until it ends. Resolves true if it went
 * through; a failure has been shown in a toast.
 */
export async function banUser({ subject }: { subject: ModerationSubject }) {
  const who = subject.username ? `@${subject.username}` : 'this person';
  const length = await chooseFrom({
    header: `Ban ${who} for how long?`,
    options: Object.entries(lengths).map(([value, { text }]) => ({ text, value: value as keyof typeof lengths })),
  });
  if (!length) {
    return false;
  }
  const reason = await askForText({ header: 'Why? (for the log)', placeholder: 'e.g. Spam account', confirmText: 'Next' });
  const { text, ms } = lengths[length];
  const confirmed = await confirm({
    header: `Ban ${who}?`,
    message: `${ms ? `For ${text}` : 'For good'}. They're signed out everywhere and can't sign in until it ends.`,
    confirmText: 'Ban',
  });
  if (!confirmed) {
    return false;
  }
  const expiresAt = ms ? new Date(Date.now() + ms).toISOString() : null;
  const result = await runOrToast(() => runBanUserMutation({ userId: subject.userId, reason, expiresAt }));
  if (result.ok) {
    void showToast(`Banned ${who}`);
  }
  return result.ok;
}

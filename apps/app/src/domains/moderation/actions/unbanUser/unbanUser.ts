import type { ModerationSubject } from '@myapp/shared/domains';
import { runOrToast } from '../../../../lib/api/runOrToast';
import { confirm } from '../../../../lib/prompts';
import { showToast } from '../../../../lib/toasts';
import { runUnbanUserMutation } from '../../operations/runUnbanUserMutation/runUnbanUserMutation';

/** Confirms, then lifts `subject`'s ban. Resolves true if it went through; a failure has been shown in a toast. */
export async function unbanUser({ subject }: { subject: ModerationSubject }) {
  const who = subject.username ? `@${subject.username}` : 'this person';
  const confirmed = await confirm({ header: `Unban ${who}?`, message: 'They can sign in again.', confirmText: 'Unban' });
  if (!confirmed) {
    return false;
  }
  const result = await runOrToast(() => runUnbanUserMutation({ userId: subject.userId }));
  if (result.ok) {
    void showToast(`Unbanned ${who}`);
  }
  return result.ok;
}

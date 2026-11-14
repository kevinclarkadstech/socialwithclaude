import { runOrToast } from '../../../../lib/api/runOrToast';
import { confirm } from '../../../../lib/prompts';
import { showToast } from '../../../../lib/toasts';
import { runRevokeOtherSessionsMutation } from '../../operations/runRevokeOtherSessionsMutation/runRevokeOtherSessionsMutation';

/** Asks first, then signs every device but this one out. Null if they cancelled; a failure has been shown in a toast. */
export async function revokeOtherSessions() {
  const confirmed = await confirm({
    header: 'Sign out of all other devices?',
    message: "You'll stay signed in here. Anywhere else will need to sign in again.",
    confirmText: 'Sign out',
  });
  if (!confirmed) {
    return null;
  }
  const result = await runOrToast(() => runRevokeOtherSessionsMutation());
  if (result.ok) {
    void showToast('Signed out of all other devices');
  }
  return result;
}

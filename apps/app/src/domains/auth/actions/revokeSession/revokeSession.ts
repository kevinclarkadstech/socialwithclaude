import { runOrToast } from '../../../../lib/api/runOrToast';
import { showToast } from '../../../../lib/toasts';
import { runRevokeSessionMutation } from '../../operations/runRevokeSessionMutation/runRevokeSessionMutation';

/** Signs one of your other devices out. A failure has been shown in a toast. */
export async function revokeSession({ id }: { id: string }) {
  const result = await runOrToast(() => runRevokeSessionMutation({ id }));
  if (result.ok) {
    void showToast('Signed out of that device');
  }
  return result;
}

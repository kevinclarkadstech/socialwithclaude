import type { GetUserProfileQueryOutput } from '@myapp/shared/domains';
import { runOrToast } from '../../../../lib/api/runOrToast';
import { showToast } from '../../../../lib/toasts';
import { refreshCallingUser } from '../../callingUserStore';
import { runBlockUserMutation } from '../../operations/runBlockUserMutation/runBlockUserMutation';

/**
 * Blocks `profile`'s user, then reloads the signed-in user, whose block
 * list the app checks against. A failure has been shown in a toast.
 */
export async function blockUser({ profile }: { profile: GetUserProfileQueryOutput }) {
  const result = await runOrToast(() => runBlockUserMutation({ profile }));
  if (result.ok) {
    await refreshCallingUser();
    void showToast(`Blocked @${profile.username}`);
  }
  return result;
}

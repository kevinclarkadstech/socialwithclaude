import type { GetUserProfileQueryOutput } from '@myapp/shared/domains';
import { runOrToast } from '../../../lib/api/runOrToast';
import { showToast } from '../../../lib/toasts';
import { refreshCallingUser } from '../callingUserStore';
import { runUnblockUserMutation } from '../operations/runUnblockUserMutation';

/** Unblocks `profile`'s user, then reloads the signed-in user's block list. A failure has been shown in a toast. */
export async function unblockUser({ profile }: { profile: GetUserProfileQueryOutput }) {
  const result = await runOrToast(() => runUnblockUserMutation({ profile }));
  if (result.ok) {
    await refreshCallingUser();
    void showToast(`Unblocked @${profile.username}`);
  }
  return result;
}

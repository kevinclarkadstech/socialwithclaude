import type { ProfileImageKind } from '@myapp/shared/domains';
import { runOrToast } from '../../../lib/api/runOrToast';
import { callingUserStore } from '../callingUserStore';
import { runRemoveProfileImageMutation } from '../operations/runRemoveProfileImageMutation';

/** Removes the signed-in user's avatar or cover. Returns their updated profile. A failure has been shown in a toast. */
export async function removeProfileImage({ kind }: { kind: ProfileImageKind }) {
  const result = await runOrToast(() => runRemoveProfileImageMutation({ kind }));
  if (result.ok) {
    const { callingUser } = callingUserStore.get();
    if (callingUser) {
      callingUserStore.set({ ...callingUser, profile: result.value });
    }
  }
  return result;
}

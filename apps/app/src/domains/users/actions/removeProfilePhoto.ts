import type { ProfilePhotoKind } from '@myapp/shared/domains';
import { runOrToast } from '../../../lib/api/runOrToast';
import { callingUserStore } from '../callingUserStore';
import { runRemoveProfilePhotoMutation } from '../operations/runRemoveProfilePhotoMutation';

/** Removes the signed-in user's avatar or cover. Returns their updated profile. A failure has been shown in a toast. */
export async function removeProfilePhoto({ kind }: { kind: ProfilePhotoKind }) {
  const result = await runOrToast(() => runRemoveProfilePhotoMutation({ kind }));
  if (result.ok) {
    const { callingUser } = callingUserStore.get();
    if (callingUser) {
      callingUserStore.set({ ...callingUser, profile: result.value });
    }
  }
  return result;
}

import type { RemoveProfilePhotoMutationInput } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';

/** Removes the signed-in user's avatar or cover. Server only (it deletes from storage). */
export function runRemoveProfilePhotoMutation(input: RemoveProfilePhotoMutationInput) {
  return api.users.removeProfilePhoto.mutate(input);
}

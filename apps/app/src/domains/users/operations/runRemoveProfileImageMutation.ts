import type { RemoveProfileImageMutationInput } from '@myapp/shared/domains';
import { api } from '../../../lib/api/trpc';

/** Removes the signed-in user's avatar or cover. Server only (it deletes from storage). */
export function runRemoveProfileImageMutation(input: RemoveProfileImageMutationInput) {
  return api.users.removeProfileImage.mutate(input);
}

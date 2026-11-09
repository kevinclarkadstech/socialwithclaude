import type { ConfirmProfileImageUploadMutationInput } from '@myapp/shared/domains';
import { api } from '../../../lib/api/trpc';

/**
 * Checks and publishes an uploaded avatar or cover. Server only (it reads the
 * private uploads), so the app calls the API directly.
 */
export function runConfirmProfileImageUploadMutation(input: ConfirmProfileImageUploadMutationInput) {
  return api.users.confirmProfileImageUpload.mutate(input);
}

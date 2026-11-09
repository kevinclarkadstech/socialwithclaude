import type { ConfirmPostMediaUploadMutationInput } from '@myapp/shared/domains';
import { api } from '../../../lib/api/trpc';

/**
 * Checks and publishes an uploaded post photo. Server only (it reads the
 * private uploads), so the app calls the API directly.
 */
export function runConfirmPostMediaUploadMutation(input: ConfirmPostMediaUploadMutationInput) {
  return api.posts.confirmPostMediaUpload.mutate(input);
}

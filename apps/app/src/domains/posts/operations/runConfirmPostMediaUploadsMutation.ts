import type { ConfirmPostMediaUploadsMutationInput } from '@myapp/shared/domains';
import { api } from '../../../lib/api/trpc';

/**
 * Checks and publishes up to 10 uploaded post photos. Server only (it reads
 * the private uploads), so the app calls the API directly.
 */
export function runConfirmPostMediaUploadsMutation(input: ConfirmPostMediaUploadsMutationInput) {
  return api.posts.confirmPostMediaUploads.mutate(input);
}

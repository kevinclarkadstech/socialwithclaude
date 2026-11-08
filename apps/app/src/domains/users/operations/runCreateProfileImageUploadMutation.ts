import type { CreateProfileImageUploadMutationInput } from '@myapp/shared/domains';
import { api } from '../../../lib/api/trpc';

/**
 * Upload URLs for a new avatar or cover. Server only (it signs storage URLs
 * with keys the app doesn't have), so the app calls the API directly.
 */
export function runCreateProfileImageUploadMutation(input: CreateProfileImageUploadMutationInput) {
  return api.users.createProfileImageUpload.mutate(input);
}

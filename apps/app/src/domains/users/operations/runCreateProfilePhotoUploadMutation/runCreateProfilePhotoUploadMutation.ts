import type { CreateProfilePhotoUploadMutationInput } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';

/**
 * Upload URLs for a new avatar or cover. Server only (it signs storage URLs
 * with keys the app doesn't have), so the app calls the API directly.
 */
export function runCreateProfilePhotoUploadMutation(input: CreateProfilePhotoUploadMutationInput) {
  return api.users.createProfilePhotoUpload.mutate(input);
}

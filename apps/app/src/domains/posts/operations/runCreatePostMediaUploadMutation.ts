import type { CreatePostMediaUploadMutationInput } from '@myapp/shared/domains';
import { api } from '../../../lib/api/trpc';

/** Upload URLs for each size of a post photo. Server only (it signs storage URLs), so the app calls the API directly. */
export function runCreatePostMediaUploadMutation(input: CreatePostMediaUploadMutationInput) {
  return api.posts.createPostMediaUpload.mutate(input);
}

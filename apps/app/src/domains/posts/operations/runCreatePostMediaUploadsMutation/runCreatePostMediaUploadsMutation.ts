import type { CreatePostMediaUploadsMutationInput } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';

/** Upload URLs for every size of up to 10 post photos. Server only (it signs storage URLs), so the app calls the API directly. */
export function runCreatePostMediaUploadsMutation(input: CreatePostMediaUploadsMutationInput) {
  return api.posts.createPostMediaUploads.mutate(input);
}

import type { CreatePostCommentPhotoUploadMutationInput } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';

/** Upload URLs for a comment's photo. Straight to the API, which checks you can comment there (or edit the comment). */
export function runCreatePostCommentPhotoUploadMutation(input: CreatePostCommentPhotoUploadMutationInput) {
  return api.postComments.createPostCommentPhotoUpload.mutate(input);
}

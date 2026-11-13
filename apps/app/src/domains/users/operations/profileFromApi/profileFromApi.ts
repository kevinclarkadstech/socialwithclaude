import type { GetUserProfileQueryOutput, UserFollowStatus, ViewerFollowStatus } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { nullIfNotFound } from '../../../../lib/api/errors';
import { withRetry } from '../../../../lib/api/withRetry';

/** A profile as the API shows it to the caller, or null if it doesn't exist (or its user blocked the caller). */
export function fetchUserProfile(username: string): Promise<GetUserProfileQueryOutput | null> {
  return withRetry(() => nullIfNotFound(fromApi(api.users.getUserProfile.query({ username }))));
}

/** The follow status behind how a follow looks to the follower (toViewerFollowStatus, reversed). */
export function followStatusFrom(viewerStatus: ViewerFollowStatus): UserFollowStatus | null {
  if (viewerStatus === 'following') {
    return 'accepted';
  }
  if (viewerStatus === 'requested') {
    return 'pending';
  }
  return null;
}

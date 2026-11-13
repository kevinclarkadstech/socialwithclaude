import { getUserPostsQuery, type GetUserProfileQueryOutput, type UserPostsType } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { withRetry } from '../../../../lib/api/withRetry';
import { logger } from '../../../../lib/logger';
import { followStatusFrom, getCallingUser } from '../../../users';

/** A page of `profile`'s posts or listings, newest first. The profile on screen supplies who can see them. */
export function runGetUserPostsQuery({ profile, type, cursor }: {
  profile: GetUserProfileQueryOutput;
  type: UserPostsType;
  cursor: string | null;
}) {
  return getUserPostsQuery({
    input: { username: profile.username, type, cursor, limit: 20 },
    context: { logger },
    dependencies: {
      getCallingUser,
      getUserProfileByUsername: async () => profile,
      getProfileVisibility: async () => profile.profileVisibility,
      getUserFollowStatus: async () => followStatusFrom(profile.viewer.followStatus),
      getPostViews: ({ cursor, limit }) =>
        withRetry(() => fromApi(api.posts.getUserPosts.query({ username: profile.username, type, cursor, limit }))),
    },
  });
}

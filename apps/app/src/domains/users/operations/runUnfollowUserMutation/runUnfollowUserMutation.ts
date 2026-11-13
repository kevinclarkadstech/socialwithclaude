import { unfollowUserMutation, type GetUserProfileQueryOutput } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../callingUserStore';

/** Unfollows `profile`, or withdraws a request to follow. */
export function runUnfollowUserMutation({ profile }: { profile: GetUserProfileQueryOutput }) {
  return unfollowUserMutation({
    input: { username: profile.username },
    context: { logger },
    dependencies: {
      getCallingUser,
      getUserProfileByUsername: async () => profile,
      unfollowUser: async () => {
        await fromApi(api.users.unfollow.mutate({ username: profile.username }));
        return true;
      },
    },
  });
}

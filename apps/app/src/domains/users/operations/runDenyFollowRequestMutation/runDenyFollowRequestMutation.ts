import { denyFollowRequestMutation, type UserProfileSummary } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../callingUserStore';

/** Denys `follower`'s request to follow the signed-in user. */
export function runDenyFollowRequestMutation({ follower }: { follower: UserProfileSummary }) {
  return denyFollowRequestMutation({
    input: { username: follower.username },
    context: { logger },
    dependencies: {
      getCallingUser,
      getUserProfileByUsername: async () => follower,
      denyUserFollowRequest: () => fromApi(api.users.denyFollowRequest.mutate({ username: follower.username })),
    },
  });
}

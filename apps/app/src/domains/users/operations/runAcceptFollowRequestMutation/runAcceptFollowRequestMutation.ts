import { acceptFollowRequestMutation, type UserProfileSummary } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../callingUserStore';

/** Accepts `follower`'s request to follow the signed-in user. */
export function runAcceptFollowRequestMutation({ follower }: { follower: UserProfileSummary }) {
  return acceptFollowRequestMutation({
    input: { username: follower.username },
    context: { logger },
    dependencies: {
      getCallingUser,
      getUserProfileByUsername: async () => follower,
      acceptUserFollowRequest: () => fromApi(api.users.acceptFollowRequest.mutate({ username: follower.username })),
    },
  });
}

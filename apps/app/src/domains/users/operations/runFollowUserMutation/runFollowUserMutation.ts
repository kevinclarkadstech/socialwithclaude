import { followUserMutation, type GetUserProfileQueryOutput } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../callingUserStore';

/** Follows `profile`, or asks to if it's followers-only. */
export function runFollowUserMutation({ profile }: { profile: GetUserProfileQueryOutput }) {
  return followUserMutation({
    input: { username: profile.username },
    context: { logger },
    dependencies: {
      // The API sends notifications when it saves; nothing to send from here.
      sendNotifications: async () => {},
      getCallingUser,
      getUserProfileByUsername: async () => profile,
      getProfileVisibility: async () => profile.profileVisibility,
      // The API decides between following and requested itself.
      followUser: () => fromApi(api.users.follow.mutate({ username: profile.username })),
    },
  });
}

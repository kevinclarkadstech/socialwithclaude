import { blockUserMutation, type GetUserProfileQueryOutput } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../callingUserStore';

/** Blocks `profile`'s user. */
export function runBlockUserMutation({ profile }: { profile: GetUserProfileQueryOutput }) {
  return blockUserMutation({
    input: { username: profile.username },
    context: { logger },
    dependencies: {
      getCallingUser,
      getUserProfileByUsername: async () => profile,
      blockUser: () => fromApi(api.users.blockUser.mutate({ username: profile.username })),
    },
  });
}

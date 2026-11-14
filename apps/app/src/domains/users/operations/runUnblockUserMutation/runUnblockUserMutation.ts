import { unblockUserMutation, type UserProfileSummary } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../callingUserStore';

/** Unblocks `profile`'s user. */
export function runUnblockUserMutation({ profile }: { profile: Pick<UserProfileSummary, 'userId' | 'username'> }) {
  return unblockUserMutation({
    input: { username: profile.username },
    context: { logger },
    dependencies: {
      getCallingUser,
      getUserProfileByUsername: async () => profile,
      unblockUser: async () => {
        await fromApi(api.users.unblockUser.mutate({ username: profile.username }));
        return true;
      },
    },
  });
}

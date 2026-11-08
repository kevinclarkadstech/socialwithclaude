import { getUserProfileQuery } from '@myapp/shared/domains';
import { logger } from '../../../lib/logger';
import { getCallingUser } from '../callingUserStore';
import { fetchUserProfile, followStatusFrom } from './profileFromApi';

/**
 * A profile and how it looks to the caller. One request: the API's answer
 * supplies every dependency, and the shared query works out the rest for
 * this caller (their block list included).
 */
export function runGetUserProfileQuery({ username }: { username: string }) {
  const fetched = fetchUserProfile(username);
  return getUserProfileQuery({
    input: { username },
    context: { logger },
    dependencies: {
      getCallingUser,
      getUserProfileByUsername: () => fetched,
      getProfileVisibility: async () => {
        const profile = await fetched;
        return profile?.profileVisibility ?? null;
      },
      getUserFollowStatus: async () => {
        const profile = await fetched;
        return profile ? followStatusFrom(profile.viewer.followStatus) : null;
      },
    },
  });
}

import type { GetUserProfileQueryOutput } from '@myapp/shared/domains';
import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '../../../lib/api/errors';
import { logger } from '../../../lib/logger';
import { runGetUserProfileQuery } from '../operations/runGetUserProfileQuery';
import { useCallingUser } from './useCallingUser';

export type UserProfileStatus = 'loading' | 'ready' | 'not-found' | 'failed';

/**
 * A profile and how it looks to the signed-in user. Reloads when they sign
 * in or out, or their block list changes, since both change what they can see.
 */
export function useUserProfile({ username }: { username: string | null }) {
  const [profile, setProfile] = useState<GetUserProfileQueryOutput | null>(null);
  const [status, setStatus] = useState<UserProfileStatus>('loading');
  const { callingUser } = useCallingUser();
  const viewerKey = callingUser
    ? `${callingUser.userId}:${callingUser.blockList.blocking.join(',')}:${callingUser.blockList.blockedBy.join(',')}`
    : 'signed-out';

  const load = useCallback(async () => {
    if (!username) {
      return;
    }
    try {
      const result = await runGetUserProfileQuery({ username });
      if (!result.ok) {
        setProfile(null);
        setStatus(result.error.type === 'not-found' ? 'not-found' : 'failed');
        return;
      }
      setProfile(result.value);
      setStatus('ready');
    } catch (error) {
      logger.warn("Couldn't load a profile", { username, error: errorMessage(error) });
      setStatus('failed');
    }
  }, [username]);

  // A different profile starts from a spinner…
  useEffect(() => {
    setProfile(null);
    setStatus('loading');
  }, [username]);

  // …and loads again when who's asking changes (viewerKey), since that's part of the answer.
  useEffect(() => {
    void load();
  }, [load, viewerKey]);

  return { profile, status, reload: load, setProfile };
}

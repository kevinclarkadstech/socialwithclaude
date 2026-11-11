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

  // A different profile starts from a spinner (set while rendering, so the last one never flashes).
  const [shownUsername, setShownUsername] = useState(username);
  if (shownUsername !== username) {
    setShownUsername(username);
    setProfile(null);
    setStatus('loading');
  }

  const apply = useCallback((loaded: LoadedProfile) => {
    if (loaded.profile !== undefined) {
      setProfile(loaded.profile);
    }
    setStatus(loaded.status);
  }, []);

  // Loads again when who's asking changes (viewerKey), since that's part of the answer.
  // A response for a profile that's no longer shown is dropped.
  useEffect(() => {
    if (!username) {
      return;
    }
    let cancelled = false;
    void loadProfile(username).then((loaded) => {
      if (!cancelled) {
        apply(loaded);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [username, viewerKey, apply]);

  const reload = useCallback(async () => {
    if (!username) {
      return;
    }
    apply(await loadProfile(username));
  }, [username, apply]);

  return { profile, status, reload, setProfile };
}

interface LoadedProfile {
  /** Undefined when the request itself failed: what's shown stays. */
  profile?: GetUserProfileQueryOutput | null;
  status: UserProfileStatus;
}

async function loadProfile(username: string): Promise<LoadedProfile> {
  try {
    const result = await runGetUserProfileQuery({ username });
    if (!result.ok) {
      return { profile: null, status: result.error.type === 'not-found' ? 'not-found' : 'failed' };
    }
    return { profile: result.value, status: 'ready' };
  } catch (error) {
    logger.warn("Couldn't load a profile", { username, error: errorMessage(error) });
    return { status: 'failed' };
  }
}

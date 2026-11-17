import { runOrToast } from '../../../../lib/api/runOrToast';
import { runGetUserProfileQuery } from '../../operations/runGetUserProfileQuery/runGetUserProfileQuery';
import { followUser } from '../followUser/followUser';

/**
 * Follows someone known only by username (e.g. a suggestion): loads their
 * profile, then follows (or asks to). Resolves "following", "requested", or
 * null if it didn't go through (shown in a toast).
 */
export async function followPerson({ username }: { username: string }): Promise<'following' | 'requested' | null> {
  const loaded = await runOrToast(() => runGetUserProfileQuery({ username }));
  if (!loaded.ok) {
    return null;
  }
  const followed = await followUser({ profile: loaded.value });
  if (!followed.ok) {
    return null;
  }
  return followed.value.status === 'accepted' ? 'following' : 'requested';
}

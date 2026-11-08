import type { GetUserProfileQueryOutput } from '@myapp/shared/domains';
import { runOrToast } from '../../../lib/api/runOrToast';
import { runFollowUserMutation } from '../operations/runFollowUserMutation';

/** Follows `profile` (or asks to, if it's followers-only). A failure has been shown in a toast. */
export function followUser({ profile }: { profile: GetUserProfileQueryOutput }) {
  return runOrToast(() => runFollowUserMutation({ profile }));
}

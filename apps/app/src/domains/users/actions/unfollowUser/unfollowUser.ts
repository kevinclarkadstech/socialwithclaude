import type { GetUserProfileQueryOutput } from '@myapp/shared/domains';
import { runOrToast } from '../../../../lib/api/runOrToast';
import { runUnfollowUserMutation } from '../../operations/runUnfollowUserMutation/runUnfollowUserMutation';

/** Unfollows `profile`, or withdraws a request. A failure has been shown in a toast. */
export function unfollowUser({ profile }: { profile: GetUserProfileQueryOutput }) {
  return runOrToast(() => runUnfollowUserMutation({ profile }));
}

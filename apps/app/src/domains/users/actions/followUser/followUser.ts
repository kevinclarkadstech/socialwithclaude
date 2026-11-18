import type { GetUserProfileQueryOutput } from '@myapp/shared/domains';
import { runOrToast } from '../../../../lib/api/runOrToast';
import { replyExpected } from '../../../../common/events/replyExpected/replyExpected';
import { runFollowUserMutation } from '../../operations/runFollowUserMutation/runFollowUserMutation';

/** Follows `profile` (or asks to, if it's followers-only). A failure has been shown in a toast. */
export async function followUser({ profile }: { profile: GetUserProfileQueryOutput }) {
  const result = await runOrToast(() => runFollowUserMutation({ profile }));
  if (result.ok) {
    replyExpected.emit('follow');
  }
  return result;
}

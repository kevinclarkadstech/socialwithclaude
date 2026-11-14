import type { UserProfileSummary } from '@myapp/shared/domains';
import { runOrToast } from '../../../../lib/api/runOrToast';
import { showToast } from '../../../../lib/toasts';
import { runAcceptFollowRequestMutation } from '../../operations/runAcceptFollowRequestMutation/runAcceptFollowRequestMutation';

/** Accepts `follower`'s request to follow you. A failure has been shown in a toast. */
export async function acceptFollowRequest({ follower }: { follower: UserProfileSummary }) {
  const result = await runOrToast(() => runAcceptFollowRequestMutation({ follower }));
  if (result.ok) {
    void showToast(`@${follower.username} is now following you`);
  }
  return result;
}

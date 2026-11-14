import type { UserProfileSummary } from '@myapp/shared/domains';
import { runOrToast } from '../../../../lib/api/runOrToast';
import { runDenyFollowRequestMutation } from '../../operations/runDenyFollowRequestMutation/runDenyFollowRequestMutation';

/** Denys `follower`'s request to follow you. A failure has been shown in a toast. */
export async function denyFollowRequest({ follower }: { follower: UserProfileSummary }) {
  const result = await runOrToast(() => runDenyFollowRequestMutation({ follower }));
  return result;
}

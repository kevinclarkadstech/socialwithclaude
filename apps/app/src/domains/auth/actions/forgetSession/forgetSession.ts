import { sessionToken } from '../../../../lib/auth/sessionToken';
import { callingUserStore } from '../../../users';
import { postCommentStore, postStore } from '../../../posts';

/** Forgets the session on this device: signed out here, with nothing left from the account it was. */
export async function forgetSession() {
  await sessionToken.clear();
  callingUserStore.set(null);
  // What the viewer sees (saves, votes) depends on who's signed in.
  postStore.reset();
  postCommentStore.reset();
}

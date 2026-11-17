import type { GetUserProfileQueryOutput } from '@myapp/shared/domains';
import { runOrToast } from '../../../../lib/api/runOrToast';
import { showToast, showToastWithChoices } from '../../../../lib/toasts';
import { getCallingUser } from '../../callingUserStore';
import { runGetUserProfileQuery } from '../../operations/runGetUserProfileQuery/runGetUserProfileQuery';
import { blockUser } from '../blockUser/blockUser';

const thanks = "Thanks for the report. We'll take a look.";

/**
 * After a report about someone: thanks you, with a button to block them too
 * (unless you already have). `profile` is theirs if it's on screen; otherwise
 * it's loaded when you tap Block. A failure has been shown in a toast.
 */
export async function offerToBlock({ userId, username, profile }: {
  userId: string;
  username: string;
  profile?: GetUserProfileQueryOutput;
}) {
  const caller = await getCallingUser();
  if (caller?.blockList.blocking.includes(userId)) {
    void showToast(thanks);
    return;
  }
  const choice = await showToastWithChoices({
    message: thanks,
    choices: [
      { text: 'OK', value: 'ok' },
      { text: 'Block user', value: 'block' },
    ],
  });
  if (choice !== 'block') {
    return;
  }
  let target = profile ?? null;
  if (!target) {
    const loaded = await runOrToast(() => runGetUserProfileQuery({ username }));
    target = loaded.ok ? loaded.value : null;
  }
  if (!target) {
    return;
  }
  await blockUser({ profile: target });
}

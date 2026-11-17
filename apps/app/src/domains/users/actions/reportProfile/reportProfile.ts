import type { GetUserProfileQueryOutput } from '@myapp/shared/domains';
import { askForReport } from '../../../../common/prompts/askForReport';
import { newId } from '../../../../lib/ids';
import { runOrToast } from '../../../../lib/api/runOrToast';
import { runReportProfileMutation } from '../../operations/runReportProfileMutation/runReportProfileMutation';
import { offerToBlock } from '../offerToBlock/offerToBlock';

/**
 * Asks why, reports `profile`'s user, then thanks you and offers to block
 * them. Does nothing if you cancel; a failure has been shown in a toast.
 */
export async function reportProfile({ profile }: { profile: GetUserProfileQueryOutput }) {
  const answer = await askForReport();
  if (!answer) {
    return;
  }
  const result = await runOrToast(() => runReportProfileMutation({ profile, report: { id: newId(), ...answer } }));
  if (result.ok) {
    await offerToBlock({ userId: profile.userId, username: profile.username, profile });
  }
}

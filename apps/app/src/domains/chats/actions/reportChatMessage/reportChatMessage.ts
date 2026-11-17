import type { ChatMember, ChatMessageView } from '@myapp/shared/domains';
import { askForReport } from '../../../../common/prompts/askForReport';
import { newId } from '../../../../lib/ids';
import { runOrToast } from '../../../../lib/api/runOrToast';
import { offerToBlock } from '../../../users';
import { runReportChatMessageMutation } from '../../operations/runReportChatMessageMutation/runReportChatMessageMutation';

/**
 * Asks why, reports a message someone else sent, then thanks you and offers
 * to block its sender. Does nothing if you cancel; a failure has been shown in a toast.
 */
export async function reportChatMessage({ message, members }: {
  message: ChatMessageView;
  members: Pick<ChatMember, 'userId' | 'clearedAt'>[];
}) {
  const answer = await askForReport();
  if (!answer) {
    return;
  }
  const result = await runOrToast(() => runReportChatMessageMutation({ message, members, report: { id: newId(), ...answer } }));
  if (result.ok) {
    await offerToBlock({ userId: message.createdBy, username: message.creator.username });
  }
}

import { reportChatMessageMutation, type ChatMember, type ChatMessageView, type ReportChatMessageMutationInput } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../../users';

/** Reports a message someone else sent in the chat on screen (`members` is that chat's). */
export function runReportChatMessageMutation({ message, members, report }: {
  message: ChatMessageView;
  members: Pick<ChatMember, 'userId' | 'clearedAt'>[];
  report: Omit<ReportChatMessageMutationInput, 'chatMessageId'>;
}) {
  const input = { ...report, chatMessageId: message.id };
  return reportChatMessageMutation({
    input,
    context: { logger },
    dependencies: {
      getCallingUser,
      getChatMessageViewById: async () => message,
      getChatMembers: async () => members,
      // The API keeps the messages before it; the app needn't send them.
      getChatMessageViewsBefore: async () => [],
      createChatMessageReport: () => fromApi(api.chats.reportMessage.mutate(input)),
    },
  });
}

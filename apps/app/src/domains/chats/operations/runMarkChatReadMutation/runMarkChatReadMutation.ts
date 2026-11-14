import { markChatReadMutation, type ChatView } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../../users';
import { chatMembers } from '../../utils/chatMembers/chatMembers';

/** Marks everything in the chat read, up to now. */
export function runMarkChatReadMutation({ chat }: { chat: ChatView }) {
  return markChatReadMutation({
    input: { chatId: chat.id },
    context: { logger },
    dependencies: {
      getCallingUser,
      getChatMembers: async () => chatMembers(chat),
      markChatRead: ({ chatId }) => fromApi(api.chats.markRead.mutate({ chatId })),
    },
  });
}

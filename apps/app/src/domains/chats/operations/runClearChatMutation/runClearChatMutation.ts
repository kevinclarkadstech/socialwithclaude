import { clearChatMutation, type ChatView } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../../users';
import { chatMembers } from '../../utils/chatMembers/chatMembers';

/** Deletes the chat for you: its messages so far are gone from your side, and it leaves your inbox until a new one comes. */
export function runClearChatMutation({ chat }: { chat: ChatView }) {
  return clearChatMutation({
    input: { chatId: chat.id },
    context: { logger },
    dependencies: {
      getCallingUser,
      getChatMembers: async () => chatMembers(chat),
      clearChat: ({ chatId }) => fromApi(api.chats.deleteChat.mutate({ chatId })),
    },
  });
}

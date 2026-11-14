import { sendChatMessageMutation, type ChatView } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../../users';
import { chatMembers } from '../../utils/chatMembers/chatMembers';

/** Sends a message. `id` comes from newId(), so a retry never sends it twice: the API returns the first. */
export function runSendChatMessageMutation({ chat, id, content }: { chat: ChatView; id: string; content: string }) {
  return sendChatMessageMutation({
    input: { id, chatId: chat.id, content },
    context: { logger },
    dependencies: {
      getCallingUser,
      getChatMembers: async () => chatMembers(chat),
      // The API answers a retry with the message it already has.
      getChatMessageViewById: async () => null,
      createChatMessage: ({ id, chatId, content }) => fromApi(api.chats.sendMessage.mutate({ id, chatId, content })),
    },
  });
}

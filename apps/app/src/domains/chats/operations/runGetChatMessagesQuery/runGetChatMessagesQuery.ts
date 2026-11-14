import { getChatMessagesQuery, type ChatView } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { withRetry } from '../../../../lib/api/withRetry';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../../users';
import { chatMembers } from '../../utils/chatMembers/chatMembers';

/** A page of a chat's messages, newest first. */
export function runGetChatMessagesQuery({ chat, cursor }: { chat: ChatView; cursor: string | null }) {
  return getChatMessagesQuery({
    input: { chatId: chat.id, cursor, limit: 30 },
    context: { logger },
    dependencies: {
      getCallingUser,
      getChatMembers: async () => chatMembers(chat),
      getChatMessageViews: ({ cursor, limit }) =>
        withRetry(() => fromApi(api.chats.getMessages.query({ chatId: chat.id, cursor, limit }))),
    },
  });
}

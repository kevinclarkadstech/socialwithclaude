import { deleteChatMessageMutation, type ChatMessageView } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../../users';

/** Deletes one of your messages, for both of you. */
export function runDeleteChatMessageMutation({ message }: { message: ChatMessageView }) {
  return deleteChatMessageMutation({
    input: { id: message.id },
    context: { logger },
    dependencies: {
      getCallingUser,
      getChatMessageViewById: async () => message,
      deleteChatMessage: async ({ id }) => {
        await fromApi(api.chats.deleteMessage.mutate({ id }));
        return true;
      },
    },
  });
}

import { updateChatMessageMutation, type ChatMessageView } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../../users';

/** Changes the text of one of your messages. */
export function runUpdateChatMessageMutation({ message, content }: { message: ChatMessageView; content: string }) {
  return updateChatMessageMutation({
    input: { id: message.id, content },
    context: { logger },
    dependencies: {
      getCallingUser,
      getChatMessageViewById: async () => message,
      updateChatMessage: ({ id, content }) => fromApi(api.chats.editMessage.mutate({ id, content })),
    },
  });
}

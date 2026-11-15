import { getOrCreateDirectChatMutation, type UserProfile } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { newId } from '../../../../lib/ids';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../../users';

/** Your chat with `receiver`: the one you already have, or a new one. */
export function runGetOrCreateDirectChatMutation({ receiver }: { receiver: UserProfile }) {
  return getOrCreateDirectChatMutation({
    input: { id: newId(), username: receiver.username },
    context: { logger },
    dependencies: {
      getCallingUser,
      getUserProfileByUsername: async () => receiver,
      createDirectChat: ({ id }) => fromApi(api.chats.getOrCreateDirectChat.mutate({ id, username: receiver.username })),
    },
  });
}

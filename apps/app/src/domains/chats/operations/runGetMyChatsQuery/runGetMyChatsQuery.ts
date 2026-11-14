import { getMyChatsQuery } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { withRetry } from '../../../../lib/api/withRetry';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../../users';

/** A page of your inbox: chats with a message, the most recent first. */
export function runGetMyChatsQuery({ cursor }: { cursor: string | null }) {
  return getMyChatsQuery({
    input: { cursor, limit: 30 },
    context: { logger },
    dependencies: {
      getCallingUser,
      getUserChatViews: ({ cursor, limit }) => withRetry(() => fromApi(api.chats.getMyChats.query({ cursor, limit }))),
    },
  });
}

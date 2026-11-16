import { searchChatsQuery } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../../users';

/** A page of messages in your chats that contain `query`, newest first. */
export function runSearchChatsQuery({ query, cursor }: { query: string; cursor: string | null }) {
  return searchChatsQuery({
    input: { query, cursor, limit: 20 },
    context: { logger },
    dependencies: {
      getCallingUser,
      searchChatMessages: ({ query, cursor, limit }) => fromApi(api.chats.search.query({ query, cursor, limit })),
    },
  });
}

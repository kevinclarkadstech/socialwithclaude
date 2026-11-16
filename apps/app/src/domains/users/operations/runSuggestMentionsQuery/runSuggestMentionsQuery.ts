import { suggestMentionsQuery } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../callingUserStore';

/** Who the signed-in user can tag after typing "@" and `query`. Not retried: the next keystroke asks again. */
export function runSuggestMentionsQuery({ query }: { query: string }) {
  return suggestMentionsQuery({
    input: { query, limit: 8 },
    context: { logger },
    dependencies: {
      getCallingUser,
      getMentionSuggestions: ({ query, limit }) => fromApi(api.users.suggestMentions.query({ query, limit })),
    },
  });
}

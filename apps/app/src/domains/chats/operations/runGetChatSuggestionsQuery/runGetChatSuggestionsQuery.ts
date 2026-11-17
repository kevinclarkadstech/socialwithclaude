import { getChatSuggestionsQuery } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../../users';

/** A few people to message: people you follow but haven't chatted with (see getChatSuggestionsQuery). */
export function runGetChatSuggestionsQuery() {
  return getChatSuggestionsQuery({
    input: { limit: 5 },
    context: { logger },
    dependencies: {
      getCallingUser,
      getChatSuggestionProfiles: ({ limit }) => fromApi(api.chats.getSuggestions.query({ limit })),
    },
  });
}

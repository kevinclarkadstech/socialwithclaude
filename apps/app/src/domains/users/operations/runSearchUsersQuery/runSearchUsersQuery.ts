import { searchUsersQuery } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../callingUserStore';

/** People whose username or name starts with `query`. */
export function runSearchUsersQuery({ query, limit }: { query: string; limit: number }) {
  return searchUsersQuery({
    input: { query, limit },
    context: { logger },
    dependencies: {
      getCallingUser,
      searchUserProfiles: ({ query, limit }) => fromApi(api.users.search.query({ query, limit })),
    },
  });
}

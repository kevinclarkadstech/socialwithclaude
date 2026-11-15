import { getMeQuery } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { withRetry } from '../../../../lib/api/withRetry';
import { logger } from '../../../../lib/logger';

/** Who's signed in, with their profile and block list, from the API (null when signed out). */
export function runGetMeQuery() {
  return getMeQuery({
    input: {},
    context: { logger },
    dependencies: {
      getSignedInUser: () => withRetry(() => fromApi(api.users.me.query())),
    },
  });
}

import { getMySettingsQuery } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { withRetry } from '../../../../lib/api/withRetry';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../callingUserStore';

/** The signed-in user's settings. */
export function runGetMySettingsQuery() {
  return getMySettingsQuery({
    input: {},
    context: { logger },
    dependencies: {
      getCallingUser,
      getUserSettings: () => withRetry(() => fromApi(api.users.getMySettings.query({}))),
    },
  });
}

import { restoreAccountMutation } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../../users';

/** Cancels the account's deletion. */
export function runRestoreAccountMutation() {
  return restoreAccountMutation({
    input: {},
    context: { logger },
    dependencies: {
      getCallingUser,
      restoreAccount: async () => {
        await fromApi(api.auth.restoreAccount.mutate({}));
      },
    },
  });
}

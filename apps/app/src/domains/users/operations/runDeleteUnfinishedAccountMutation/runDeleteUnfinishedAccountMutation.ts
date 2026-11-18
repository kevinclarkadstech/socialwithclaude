import { deleteUnfinishedAccountMutation } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../callingUserStore';

/** Deletes the signed-in account while sign-up isn't finished (on a device where sign-up was refused for age). */
export function runDeleteUnfinishedAccountMutation() {
  return deleteUnfinishedAccountMutation({
    input: {},
    context: { logger },
    dependencies: {
      getCallingUser,
      deleteUnfinishedAccount: async () => {
        await fromApi(api.auth.deleteUnfinishedAccount.mutate({}));
      },
    },
  });
}

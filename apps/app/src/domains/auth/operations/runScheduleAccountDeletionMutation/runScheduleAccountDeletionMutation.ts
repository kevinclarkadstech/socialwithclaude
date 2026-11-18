import { scheduleAccountDeletionMutation } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../../users';

/**
 * Deletes the account, confirmed with the emailed code. Only the API can
 * check the code: here it's passed through, and a wrong one makes the call throw.
 */
export function runScheduleAccountDeletionMutation({ code }: { code: string }) {
  return scheduleAccountDeletionMutation({
    input: { code },
    context: { logger },
    dependencies: {
      getCallingUser,
      verifyAccountDeletionCode: async () => true,
      scheduleAccountDeletion: async () => {
        await fromApi(api.auth.scheduleAccountDeletion.mutate({ code }));
      },
    },
  });
}

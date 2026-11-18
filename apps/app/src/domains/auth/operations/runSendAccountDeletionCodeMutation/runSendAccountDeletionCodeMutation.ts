import { sendAccountDeletionCodeMutation } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../../users';

/** Emails a code to confirm deleting the account with. */
export function runSendAccountDeletionCodeMutation() {
  return sendAccountDeletionCodeMutation({
    input: {},
    context: { logger },
    dependencies: {
      getCallingUser,
      sendAccountDeletionCode: async () => {
        await fromApi(api.auth.sendAccountDeletionCode.mutate({}));
      },
    },
  });
}

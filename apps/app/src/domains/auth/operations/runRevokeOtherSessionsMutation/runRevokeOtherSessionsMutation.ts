import { revokeOtherSessionsMutation } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../../users';

/** Signs every device but this one out. */
export function runRevokeOtherSessionsMutation() {
  return revokeOtherSessionsMutation({
    input: {},
    context: { logger },
    dependencies: {
      getCallingUser,
      revokeOtherSessions: async () => {
        await fromApi(api.auth.revokeOtherSessions.mutate({}));
      },
    },
  });
}

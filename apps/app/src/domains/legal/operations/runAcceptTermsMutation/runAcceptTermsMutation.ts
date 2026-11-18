import { acceptTermsMutation } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../../users';

/** Records that the signed-in user agreed to `version` of the terms. */
export function runAcceptTermsMutation({ version }: { version: string }) {
  return acceptTermsMutation({
    input: { version },
    context: { logger },
    dependencies: {
      getCallingUser,
      recordTermsAccepted: async () => {
        await fromApi(api.auth.acceptTerms.mutate({ version }));
      },
    },
  });
}

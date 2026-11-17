import { updateFeedbackStatusMutation, type UpdateFeedbackStatusMutationInput } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../../users';

/** Marks feedback new, read or done. */
export function runUpdateFeedbackStatusMutation(input: UpdateFeedbackStatusMutationInput) {
  return updateFeedbackStatusMutation({
    input,
    context: { logger },
    dependencies: {
      getCallingUser,
      updateUserFeedbackStatus: async () => {
        await fromApi(api.admin.updateFeedbackStatus.mutate(input));
        return true;
      },
    },
  });
}

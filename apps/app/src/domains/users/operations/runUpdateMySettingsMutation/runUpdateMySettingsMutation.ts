import { updateMySettingsMutation, type UpdateMySettingsMutationInput } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../callingUserStore';

/** Changes some of the signed-in user's settings; the rest stay as they are. */
export function runUpdateMySettingsMutation(changes: UpdateMySettingsMutationInput) {
  return updateMySettingsMutation({
    input: changes,
    context: { logger },
    dependencies: {
      getCallingUser,
      updateUserSettings: ({ userId: _userId, ...input }) => fromApi(api.users.updateMySettings.mutate(input)),
    },
  });
}

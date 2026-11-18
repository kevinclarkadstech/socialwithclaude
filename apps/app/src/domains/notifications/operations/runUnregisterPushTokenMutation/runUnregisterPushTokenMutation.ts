import { unregisterPushTokenMutation } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../../users';

/** Stops push notifications to this device. */
export function runUnregisterPushTokenMutation({ token }: { token: string }) {
  return unregisterPushTokenMutation({
    input: { token },
    context: { logger },
    dependencies: {
      getCallingUser,
      deletePushToken: async () => {
        await fromApi(api.notifications.unregisterPushToken.mutate({ token }));
      },
    },
  });
}

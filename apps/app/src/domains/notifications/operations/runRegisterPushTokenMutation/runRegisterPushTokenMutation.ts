import { registerPushTokenMutation, type PushPlatform } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../../users';

/** Sends the signed-in user's push notifications to this device. */
export function runRegisterPushTokenMutation({ token, platform }: { token: string; platform: PushPlatform }) {
  return registerPushTokenMutation({
    input: { token, platform },
    context: { logger },
    dependencies: {
      getCallingUser,
      savePushToken: async () => {
        await fromApi(api.notifications.registerPushToken.mutate({ token, platform }));
      },
    },
  });
}

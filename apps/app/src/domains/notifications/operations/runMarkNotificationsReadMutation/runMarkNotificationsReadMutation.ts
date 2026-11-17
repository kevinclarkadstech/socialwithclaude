import { markNotificationsReadMutation } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../../users';

/** Marks all your notifications read. */
export function runMarkNotificationsReadMutation() {
  return markNotificationsReadMutation({
    input: {},
    context: { logger },
    dependencies: {
      getCallingUser,
      markNotificationsRead: async () => {
        await fromApi(api.notifications.markAllRead.mutate({}));
        return 0;
      },
    },
  });
}

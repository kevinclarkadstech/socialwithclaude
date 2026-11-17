import { getUnreadNotificationCountQuery } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../../users';

/** How many of your notifications you haven't seen (the number on the bell). */
export function runGetUnreadNotificationCountQuery() {
  return getUnreadNotificationCountQuery({
    input: {},
    context: { logger },
    dependencies: {
      getCallingUser,
      countUnreadNotifications: async () => (await fromApi(api.notifications.getUnreadCount.query({}))).count,
    },
  });
}

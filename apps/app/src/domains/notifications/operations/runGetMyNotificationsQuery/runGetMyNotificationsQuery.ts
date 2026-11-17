import { getMyNotificationsQuery } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { withRetry } from '../../../../lib/api/withRetry';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../../users';

/** A page of your notifications, newest first. */
export function runGetMyNotificationsQuery({ cursor }: { cursor: string | null }) {
  return getMyNotificationsQuery({
    input: { cursor, limit: 30 },
    context: { logger },
    dependencies: {
      getCallingUser,
      getUserNotifications: ({ cursor, limit }) => withRetry(() => fromApi(api.notifications.getMine.query({ cursor, limit }))),
    },
  });
}

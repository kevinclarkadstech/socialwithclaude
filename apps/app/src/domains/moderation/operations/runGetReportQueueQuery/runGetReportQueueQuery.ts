import { getReportQueueQuery } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { withRetry } from '../../../../lib/api/withRetry';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../../users';

/** The moderation queue: "open" (waiting, longest first) or "resolved" (most recent first). */
export function runGetReportQueueQuery({ status }: { status: 'open' | 'resolved' }) {
  return getReportQueueQuery({
    input: { status, limit: 100 },
    context: { logger },
    dependencies: {
      getCallingUser,
      getReportedItems: (input) => withRetry(() => fromApi(api.moderation.getReportQueue.query(input))),
    },
  });
}

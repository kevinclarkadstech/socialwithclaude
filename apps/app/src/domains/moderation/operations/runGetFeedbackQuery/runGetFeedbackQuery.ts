import { getFeedbackQuery, type UserFeedbackStatus } from '@myapp/shared/domains';
import { api } from '../../../../lib/api/trpc';
import { fromApi } from '../../../../lib/api/results';
import { withRetry } from '../../../../lib/api/withRetry';
import { logger } from '../../../../lib/logger';
import { getCallingUser } from '../../../users';

/** A page of feedback, newest first; only with `status` if given. */
export function runGetFeedbackQuery({ cursor, status }: { cursor: string | null; status: UserFeedbackStatus | null }) {
  return getFeedbackQuery({
    input: { cursor, limit: 30, status },
    context: { logger },
    dependencies: {
      getCallingUser,
      getFeedbackItems: (input) => withRetry(() => fromApi(api.moderation.getFeedback.query(input))),
    },
  });
}

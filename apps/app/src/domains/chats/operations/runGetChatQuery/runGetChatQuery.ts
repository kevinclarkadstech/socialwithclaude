import { api } from '../../../../lib/api/trpc';
import { withRetry } from '../../../../lib/api/withRetry';

/**
 * One of your chats, opened by its id (e.g. from a link). The app doesn't
 * know who's in it until it's loaded, so it calls the API directly; the API
 * runs the shared query.
 */
export function runGetChatQuery({ chatId }: { chatId: string }) {
  return withRetry(() => api.chats.getChat.query({ chatId }));
}

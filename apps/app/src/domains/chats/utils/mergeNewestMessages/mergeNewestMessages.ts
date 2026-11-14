import type { ChatMessageView } from '@myapp/shared/domains';
import type { ShownChatMessage } from '../../types';
import { sentMessage } from '../sentMessage/sentMessage';

/**
 * The newest page of a chat (newest first) merged into what's shown (oldest
 * first). Shown messages the page has are updated (an edit); ones inside the
 * page's span that it no longer has were deleted, so they go; older ones
 * (loaded earlier) stay. Yours still sending, or that failed, stay at the end.
 */
export function mergeNewestMessages({ shown, newestFirst }: {
  shown: ShownChatMessage[];
  newestFirst: ChatMessageView[];
}): ShownChatMessage[] {
  const fresh = new Map(newestFirst.map((message) => [message.id, message]));
  const oldestInPage = newestFirst.at(-1)?.createdAt ?? null;
  const confirmed = shown
    .filter((message) => message.status === 'sent')
    .filter((message) => fresh.has(message.id) || (oldestInPage !== null && message.createdAt < oldestInPage));
  const confirmedIds = new Set(confirmed.map((message) => message.id));
  const added = newestFirst.filter((message) => !confirmedIds.has(message.id));
  const merged = [...confirmed.map((message) => fresh.get(message.id) ?? message), ...added]
    .map(sentMessage)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  // A send that reached the server shows from it; the rest stay at the end.
  const unsent = shown.filter((message) => message.status !== 'sent' && !fresh.has(message.id));
  return [...merged, ...unsent];
}

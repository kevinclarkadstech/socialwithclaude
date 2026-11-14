import type { ChatView } from '@myapp/shared/domains';
import { useEffect, useState } from 'react';
import { apiErrorCode } from '../../../../lib/api/errors';
import { runGetChatQuery } from '../../operations/runGetChatQuery/runGetChatQuery';

export type ChatStatus = 'loading' | 'ready' | 'not-found' | 'failed';

/** One of your chats, by id: who it's with. Not found if it doesn't exist or you're not in it. */
export function useChat(chatId: string) {
  const [chat, setChat] = useState<ChatView | null>(null);
  const [status, setStatus] = useState<ChatStatus>('loading');

  // A different chat starts from a spinner (set while rendering, so the last one never flashes).
  const [shownChatId, setShownChatId] = useState(chatId);
  if (shownChatId !== chatId) {
    setShownChatId(chatId);
    setChat(null);
    setStatus('loading');
  }

  useEffect(() => {
    let cancelled = false;
    runGetChatQuery({ chatId })
      .then((result) => {
        if (cancelled) {
          return;
        }
        if (result.ok) {
          setChat(result.value);
          setStatus('ready');
        } else {
          setStatus(result.error.type === 'not-found' ? 'not-found' : 'failed');
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setStatus(apiErrorCode(error) === 'NOT_FOUND' ? 'not-found' : 'failed');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [chatId]);

  return { chat, status };
}

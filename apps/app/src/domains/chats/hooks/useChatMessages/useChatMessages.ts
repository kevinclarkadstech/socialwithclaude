import type { ChatMessageView, ChatView } from '@myapp/shared/domains';
import type { Page, Result } from '@myapp/shared/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../../../../lib/api/errors';
import { runOrToast } from '../../../../lib/api/runOrToast';
import { newId } from '../../../../lib/ids';
import { showErrorToast } from '../../../../lib/toasts';
import { usePolling } from '../../../../lib/usePolling';
import { useCallingUser } from '../../../users';
import { runDeleteChatMessageMutation } from '../../operations/runDeleteChatMessageMutation/runDeleteChatMessageMutation';
import { runGetChatMessagesQuery } from '../../operations/runGetChatMessagesQuery/runGetChatMessagesQuery';
import { runMarkChatReadMutation } from '../../operations/runMarkChatReadMutation/runMarkChatReadMutation';
import { runSendChatMessageMutation } from '../../operations/runSendChatMessageMutation/runSendChatMessageMutation';
import { replyExpected } from '../../../../common/events/replyExpected/replyExpected';
import { runUpdateChatMessageMutation } from '../../operations/runUpdateChatMessageMutation/runUpdateChatMessageMutation';
import type { ShownChatMessage } from '../../types';
import { mergeNewestMessages } from '../../utils/mergeNewestMessages/mergeNewestMessages';
import { sentMessage as sent } from '../../utils/sentMessage/sentMessage';

export type ChatMessagesStatus = 'loading' | 'ready' | 'failed';

/**
 * A chat's messages, oldest first. Loads the newest page (and earlier ones on
 * request), marks the chat read when something new from the other person is
 * shown, and sends, edits and deletes your messages. A message you send shows
 * straight away; if it fails it stays, marked, to retry. Its id is made here,
 * so a retry can't send it twice. While `isShown`, it checks for new
 * messages (and edits and deletes) every few seconds.
 */
export function useChatMessages(chat: ChatView | null, { isShown }: { isShown: boolean }) {
  const { callingUser } = useCallingUser();
  const [messages, setMessages] = useState<ShownChatMessage[]>([]);
  const [status, setStatus] = useState<ChatMessagesStatus>('loading');
  const [olderCursor, setOlderCursor] = useState<string | null>(null);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  // The newest message from the other person that's been marked read.
  const lastMarkedRead = useRef<string | null>(null);

  const applyNewest = useCallback(
    (result: Result<Page<ChatMessageView>> | null, { first }: { first: boolean }) => {
      if (!result?.ok) {
        if (first) {
          setStatus('failed');
        }
        return;
      }
      setMessages((shown) => mergeNewestMessages({ shown: first ? [] : shown, newestFirst: result.value.items }));
      if (first) {
        setOlderCursor(result.value.nextCursor);
      }
      setStatus('ready');

      const newestFromOther = result.value.items.find((message) => message.createdBy !== callingUser?.userId)?.id ?? null;
      if (chat && newestFromOther && newestFromOther !== lastMarkedRead.current) {
        lastMarkedRead.current = newestFromOther;
        // Best effort: the inbox shows it unread a little longer if this fails.
        void runMarkChatReadMutation({ chat }).catch(() => undefined);
      }
    },
    [chat, callingUser?.userId],
  );

  useEffect(() => {
    if (!chat) {
      return;
    }
    let cancelled = false;
    void runGetChatMessagesQuery({ chat, cursor: null })
      .catch(() => null)
      .then((result) => {
        if (!cancelled) {
          applyNewest(result, { first: true });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [chat, applyNewest]);

  usePolling(() => refresh(), { intervalMs: 4000, enabled: isShown && chat !== null && status === 'ready' });

  /** Checks for new messages (and edits and deletes) without losing what's shown. */
  async function refresh() {
    if (!chat) {
      return;
    }
    const result = await runGetChatMessagesQuery({ chat, cursor: null }).catch(() => null);
    applyNewest(result, { first: false });
  }

  async function loadOlder() {
    if (!chat || !olderCursor || isLoadingOlder) {
      return;
    }
    setIsLoadingOlder(true);
    try {
      const result = await runGetChatMessagesQuery({ chat, cursor: olderCursor });
      if (result.ok) {
        const older = [...result.value.items].reverse().map(sent);
        setMessages((shown) => [...older.filter((message) => !shown.some((s) => s.id === message.id)), ...shown]);
        setOlderCursor(result.value.nextCursor);
      }
    } catch (error) {
      void showErrorToast(errorMessage(error));
    } finally {
      setIsLoadingOlder(false);
    }
  }

  async function deliver(message: ShownChatMessage) {
    if (!chat) {
      return;
    }
    const result = await runSendChatMessageMutation({ chat, id: message.id, content: message.content }).catch(() => null);
    if (result?.ok) {
      replyExpected.emit('message');
    }
    setMessages((shown) =>
      shown.map((item) => (item.id !== message.id ? item : result?.ok ? sent(result.value) : { ...item, status: 'failed' })),
    );
  }

  /** Shows the message straight away, then sends it. */
  function send(content: string) {
    if (!chat || !callingUser?.profile) {
      return;
    }
    const now = new Date().toISOString();
    const { userId, username, firstName, lastName, updatedAt } = callingUser.profile;
    const message: ShownChatMessage = {
      id: newId(),
      chatId: chat.id,
      content,
      createdBy: userId,
      updatedBy: userId,
      createdAt: now,
      updatedAt: now,
      creator: { userId, username, firstName, lastName, updatedAt },
      viewer: { hasSaved: false },
      status: 'sending',
    };
    setMessages((shown) => [...shown, message]);
    void deliver(message);
  }

  /** Sends a message that failed again, with the same id. */
  function retry(message: ShownChatMessage) {
    setMessages((shown) => shown.map((item) => (item.id === message.id ? { ...item, status: 'sending' } : item)));
    void deliver(message);
  }

  async function edit(message: ShownChatMessage, content: string) {
    const result = await runOrToast(() => runUpdateChatMessageMutation({ message, content }));
    if (result.ok) {
      setMessages((shown) => shown.map((item) => (item.id === message.id ? sent(result.value) : item)));
    }
  }

  async function remove(message: ShownChatMessage) {
    // One that never sent only needs to leave the screen.
    if (message.status === 'failed') {
      setMessages((shown) => shown.filter((item) => item.id !== message.id));
      return;
    }
    const result = await runOrToast(() => runDeleteChatMessageMutation({ message }));
    if (result.ok) {
      setMessages((shown) => shown.filter((item) => item.id !== message.id));
    }
  }

  return { messages, status, hasOlder: olderCursor !== null, isLoadingOlder, loadOlder, refresh, send, retry, edit, remove };
}

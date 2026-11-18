import { useCallback } from 'react';
import { usePageContext, useTabHref, useTabNavigation } from '../../../../navigation';

/** The Chats tab's id (see app/routes.tsx): its own chat pages are /chats/:chatId. */
const chatsTabId = 'chats';

/**
 * Where to open a chat from the current page: in the tab you're in
 * (/feed/chat/:chatId), so Back returns to where you were, like a post or a
 * profile. In the Chats tab, and from pages opened over the tabs (such as
 * your own profile), it's the Chats tab's /chats/:chatId.
 */
export function useChatHref(): (chatId: string) => string {
  const { tabId } = usePageContext();
  const { onRootRoute } = useTabNavigation();
  const tabHref = useTabHref();
  return useCallback(
    (chatId: string) => (onRootRoute || tabId === chatsTabId ? `/chats/${chatId}` : tabHref(`chat/${chatId}`)),
    [onRootRoute, tabId, tabHref],
  );
}

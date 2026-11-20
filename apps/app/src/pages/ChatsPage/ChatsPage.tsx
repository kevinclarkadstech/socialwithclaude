import {
  IonButton,
  IonContent,
  IonItem,
  IonList,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
} from '@ionic/react';
import { createOutline, searchOutline } from 'ionicons/icons';
import { requireCallerWithProfile } from '@myapp/shared/authorization';
import { useEffect, useRef } from 'react';
import { disallowedActions } from '../../common/events/disallowedActions/disallowedActions';
import { HeaderIconButton } from '../../common/components/HeaderIconButton/HeaderIconButton';
import { ChatListItem, ChatSuggestions, runGetMyChatsQuery } from '../../domains/chats';
import { useCallingUser } from '../../domains/users';
import { AppHeader } from '../../common/components/AppHeader/AppHeader';
import { PageColumns } from '../../common/components/PageColumns/PageColumns';
import { usePagedQuery } from '../../lib/api/usePagedQuery';
import { usePageContext } from '../../navigation';
import { usePolling } from '../../lib/usePolling';
import { usePullToRefresh } from '../../lib/usePullToRefresh';
import '../../common/styles/pages.css';

/** The Chats tab: your conversations, the most recent first, unread ones marked. Needs sign-in. */
export function ChatsPage() {
  const { callingUser } = useCallingUser();
  const signedUpCheck = requireCallerWithProfile({ caller: callingUser });

  return (
    <IonPage>
      <AppHeader
        actions={
          // Your chats only exist once you've signed up.
          signedUpCheck.ok && (
            <>
              <HeaderIconButton icon={searchOutline} label="Search messages" to="/chats/search" />
              <HeaderIconButton icon={createOutline} label="New message" to="/chats/new" />
            </>
          )
        }
      />
      <IonContent>
        <PageColumns rail={<ChatSuggestions />}>
          {signedUpCheck.ok ? (
            // Keyed by user, so signing in as someone else starts a fresh inbox.
            <Inbox key={signedUpCheck.value.userId} />
          ) : (
            <div className="page-message">
              <p>{callingUser ? 'Finish signing up to chat.' : 'Sign in to see your chats.'}</p>
              <IonButton onClick={() => disallowedActions.emit({ error: signedUpCheck.error })}>
                {callingUser ? 'Finish sign-up' : 'Sign in'}
              </IonButton>
            </div>
          )}
        </PageColumns>
      </IonContent>
    </IonPage>
  );
}

function Inbox() {
  const chats = usePagedQuery(runGetMyChatsQuery);
  const { isVisible } = usePageContext();
  const wasVisible = useRef(isVisible);

  // New messages come in while it's open: checked once a minute (an open chat checks more often),
  // straight away when the app comes back to the foreground, and on pulling down.
  usePolling(() => chats.reload(), { intervalMs: 60_000, enabled: isVisible && chats.status === 'ready' });
  const onPull = usePullToRefresh(() => chats.reload());

  // Back from a chat: what's unread, and the order, may have changed.
  useEffect(() => {
    if (isVisible && !wasVisible.current) {
      void chats.reload();
    }
    wasVisible.current = isVisible;
  }, [isVisible, chats]);

  return (
    <>
      <IonRefresher slot="fixed" onIonRefresh={onPull}>
        <IonRefresherContent />
      </IonRefresher>
      {chats.status === 'loading' && (
        <div className="page-message">
          <IonSpinner />
        </div>
      )}
      {chats.status === 'failed' && <p className="page-message">Couldn't load your chats. Pull down to try again.</p>}
      {chats.status === 'ready' && chats.items.length === 0 && (
        <p className="page-message">No chats yet. Your conversations will show up here.</p>
      )}
      <IonList>
        {chats.items.map((chat) => (
          <ChatListItem key={chat.id} chat={chat} />
        ))}
        {chats.hasMore && (
          <IonItem button detail={false} lines="none" disabled={chats.isLoadingMore} onClick={() => void chats.loadMore()}>
            Show more
          </IonItem>
        )}
      </IonList>
    </>
  );
}

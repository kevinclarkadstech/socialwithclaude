import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonList,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { requireCallerWithProfile } from '@myapp/shared/authorization';
import { useEffect, useRef } from 'react';
import { disallowedActions } from '../../common/events/disallowedActions/disallowedActions';
import { ChatListItem, runGetMyChatsQuery } from '../../domains/chats';
import { AccountButton, useCallingUser } from '../../domains/users';
import { usePagedQuery } from '../../lib/api/usePagedQuery';
import { usePageContext } from '../../navigation';
import '../../common/styles/pages.css';

/** The Chats tab: your conversations, the most recent first, unread ones marked. Needs sign-in. */
export function ChatsPage() {
  const { callingUser } = useCallingUser();
  const signedUpCheck = requireCallerWithProfile({ caller: callingUser });

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Chats</IonTitle>
          <IonButtons slot="end">
            <AccountButton />
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
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
      </IonContent>
    </IonPage>
  );
}

function Inbox() {
  const chats = usePagedQuery(runGetMyChatsQuery);
  const { isVisible } = usePageContext();
  const wasVisible = useRef(isVisible);

  // Back from a chat: what's unread, and the order, may have changed.
  useEffect(() => {
    if (isVisible && !wasVisible.current) {
      void chats.reload();
    }
    wasVisible.current = isVisible;
  }, [isVisible, chats]);

  return (
    <>
      <IonRefresher slot="fixed" onIonRefresh={(event) => void chats.reload().finally(() => event.detail.complete())}>
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

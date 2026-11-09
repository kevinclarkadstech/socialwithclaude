import {
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonTitle,
  IonIcon,
  IonToolbar,
} from '@ionic/react';
import { add } from 'ionicons/icons';
import { useState } from 'react';
import { AccountButton } from '../../domains/users/components/AccountButton/AccountButton';
import { useRequireSignIn } from '../../common/hooks/useRequireSignIn';
import { useFeed } from '../../domains/posts/hooks/useFeed';
import { ComposePostModal } from '../../domains/posts/components/ComposePostModal/ComposePostModal';
import { PendingPosts } from '../../domains/posts/components/PendingPosts/PendingPosts';
import { PostCard } from '../../domains/posts/components/PostCard/PostCard';
import '../../common/styles/pages.css';

/** The Feed tab: everyone's posts and listings, newest first. Readable signed out. */
export function FeedPage() {
  const { ids: postIds, isLoading, error, hasMore, loadMore, refresh } = useFeed();
  const requireSignIn = useRequireSignIn();
  const [isComposing, setIsComposing] = useState(false);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Feed</IonTitle>
          <IonButtons slot="end">
            <AccountButton />
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={(event) => void refresh().finally(() => event.detail.complete())}>
          <IonRefresherContent />
        </IonRefresher>

        {isLoading && (
          <div className="page-message">
            <IonSpinner />
          </div>
        )}
        {error !== null && <p className="page-message">Couldn't load the feed. Pull down to try again.</p>}
        {!isLoading && error === null && postIds.length === 0 && <p className="page-message">Nothing here yet.</p>}

        <PendingPosts />
        {postIds.map((id) => (
          <PostCard key={id} postId={id} />
        ))}

        <IonInfiniteScroll disabled={!hasMore} onIonInfinite={(event) => void loadMore().finally(() => event.target.complete())}>
          <IonInfiniteScrollContent />
        </IonInfiniteScroll>

        <IonFab slot="fixed" vertical="bottom" horizontal="end">
          <IonFabButton aria-label="New post" onClick={() => requireSignIn(() => setIsComposing(true))}>
            <IonIcon icon={add} aria-hidden="true" />
          </IonFabButton>
        </IonFab>
        <ComposePostModal isOpen={isComposing} onDismiss={() => setIsComposing(false)} />
      </IonContent>
    </IonPage>
  );
}

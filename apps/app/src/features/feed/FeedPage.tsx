import {
  IonButtons,
  IonContent,
  IonHeader,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { AccountButton } from '../../common/components/AccountButton';
import { useFeed } from '../../domains/posts/hooks/useFeed';
import { PostCard } from './PostCard';
import '../pages.css';

/** The Feed tab: everyone's posts and listings, newest first. Readable signed out. */
export default function FeedPage() {
  const { postIds, isLoading, error, hasMore, loadMore, refresh } = useFeed();

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

        {postIds.map((id) => (
          <PostCard key={id} postId={id} />
        ))}

        <IonInfiniteScroll disabled={!hasMore} onIonInfinite={(event) => void loadMore().finally(() => event.target.complete())}>
          <IonInfiniteScrollContent />
        </IonInfiniteScroll>
      </IonContent>
    </IonPage>
  );
}

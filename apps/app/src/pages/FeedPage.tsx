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
import { AccountButton } from '../components/AccountButton';
import { PostCard } from '../components/PostCard';
import { useFeed } from '../hooks/useFeed';
import './pages.css';

/** The Feed tab: everyone's posts and listings, newest first. Readable signed out. */
export default function FeedPage() {
  const { posts, isPending, isError, hasMore, loadMore, refresh } = useFeed();

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

        {isPending && (
          <div className="page-message">
            <IonSpinner />
          </div>
        )}
        {isError && posts.length === 0 && <p className="page-message">Couldn't load the feed. Pull down to try again.</p>}
        {!isPending && !isError && posts.length === 0 && <p className="page-message">Nothing here yet.</p>}

        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}

        <IonInfiniteScroll
          disabled={!hasMore}
          onIonInfinite={(event) => void loadMore().finally(() => event.target.complete())}
        >
          <IonInfiniteScrollContent />
        </IonInfiniteScroll>
      </IonContent>
    </IonPage>
  );
}

import {
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonLabel,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { listingStatuses, type ListingStatus } from '@myapp/shared/domains';
import { add } from 'ionicons/icons';
import { useState } from 'react';
import { listingStatusLabels } from '../../common/formatters/listings';
import { useRequireSignIn } from '../../common/hooks/useRequireSignIn';
import { AccountButton } from '../../domains/users/components/AccountButton/AccountButton';
import { ComposeListingModal } from '../../domains/posts/components/ComposeListingModal/ComposeListingModal';
import { PendingPosts } from '../../domains/posts/components/PendingPosts/PendingPosts';
import { PostCard } from '../../domains/posts/components/PostCard/PostCard';
import { useListings } from '../../domains/posts/hooks/useListings';
import '../../common/styles/pages.css';

const ALL = 'all';
type Filter = ListingStatus | typeof ALL;

/** The Marketplace tab: listings, newest first, filtered by status (available by default). Readable signed out. */
export function MarketplacePage() {
  const [filter, setFilter] = useState<Filter>('available');
  const { ids: postIds, isLoading, error, hasMore, loadMore, refresh } = useListings({
    status: filter === ALL ? null : filter,
  });
  const requireSignIn = useRequireSignIn();
  const [isComposing, setIsComposing] = useState(false);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Marketplace</IonTitle>
          <IonButtons slot="end">
            <AccountButton />
          </IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonSegment value={filter} onIonChange={(event) => setFilter(event.detail.value as Filter)}>
            {listingStatuses.map((status) => (
              <IonSegmentButton key={status} value={status}>
                <IonLabel>{listingStatusLabels[status]}</IonLabel>
              </IonSegmentButton>
            ))}
            <IonSegmentButton value={ALL}>
              <IonLabel>All</IonLabel>
            </IonSegmentButton>
          </IonSegment>
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
        {error !== null && <p className="page-message">Couldn't load listings. Pull down to try again.</p>}
        {!isLoading && error === null && postIds.length === 0 && <p className="page-message">No listings here yet.</p>}

        {/* A listing being sent is available, so it shows under Available and All. */}
        {(filter === 'available' || filter === ALL) && <PendingPosts kind="listing" />}
        {postIds.map((id) => (
          <PostCard key={id} postId={id} />
        ))}

        <IonInfiniteScroll disabled={!hasMore} onIonInfinite={(event) => void loadMore().finally(() => event.target.complete())}>
          <IonInfiniteScrollContent />
        </IonInfiniteScroll>

        <IonFab slot="fixed" vertical="bottom" horizontal="end">
          <IonFabButton aria-label="New listing" onClick={() => requireSignIn(() => setIsComposing(true))}>
            <IonIcon icon={add} aria-hidden="true" />
          </IonFabButton>
        </IonFab>
        <ComposeListingModal isOpen={isComposing} onDismiss={() => setIsComposing(false)} />
      </IonContent>
    </IonPage>
  );
}

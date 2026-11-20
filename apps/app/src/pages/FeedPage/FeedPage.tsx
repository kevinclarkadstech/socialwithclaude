import {
  IonContent,
  IonFab,
  IonFabButton,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonIcon,
} from '@ionic/react';
import { add, searchOutline } from 'ionicons/icons';
import { useState } from 'react';
import { canCreatePost } from '@myapp/shared/domains';
import { SuggestedPeople, useCallingUser } from '../../domains/users';
import { PageColumns } from '../../common/components/PageColumns/PageColumns';
import { SponsoredSlot } from '../../common/components/SponsoredSlot/SponsoredSlot';
import { AppHeader } from '../../common/components/AppHeader/AppHeader';
import { disallowedActions } from '../../common/events/disallowedActions/disallowedActions';
import { HeaderIconButton } from '../../common/components/HeaderIconButton/HeaderIconButton';
import { ComposePostModal, PendingPosts, PostCard, useFeed } from '../../domains/posts';
import '../../common/styles/pages.css';
import { usePullToRefresh } from '../../lib/usePullToRefresh';

/** The Feed tab: everyone's posts and listings, newest first. Readable signed out. */
export function FeedPage() {
  const { ids: postIds, isLoading, error, hasMore, loadMore, refresh } = useFeed();
  const { callingUser } = useCallingUser();
  const createPostCheck = canCreatePost({ caller: callingUser });
  const [isComposing, setIsComposing] = useState(false);
  const compose = () => setIsComposing(true);
  const onPull = usePullToRefresh(refresh);

  return (
    <IonPage>
      <AppHeader actions={<HeaderIconButton icon={searchOutline} label="Search" to="/feed/search" />} />
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={onPull}>
          <IonRefresherContent />
        </IonRefresher>

        <PageColumns
          rail={
            <>
              <SuggestedPeople />
              <SponsoredSlot />
            </>
          }
        >
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
        </PageColumns>

        <IonFab slot="fixed" vertical="bottom" horizontal="end">
          <IonFabButton
            aria-label="New post"
            onClick={() => {
              if (!createPostCheck.ok) {
                disallowedActions.emit({ error: createPostCheck.error, action: compose });
                return;
              }
              compose();
            }}
          >
            <IonIcon icon={add} aria-hidden="true" />
          </IonFabButton>
        </IonFab>
        <ComposePostModal isOpen={isComposing} onDismiss={() => setIsComposing(false)} />
      </IonContent>
    </IonPage>
  );
}

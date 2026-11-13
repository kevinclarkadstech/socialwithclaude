import { IonButton, IonCard, IonCardContent, IonIcon, IonLabel, IonNote, IonSpinner, IonToolbar } from '@ionic/react';
import { alertCircle } from 'ionicons/icons';
import { displayName } from '../../../../utils/formatters/names';
import { listingPrice } from '../../../../utils/formatters/prices';
import { listingConditionLabels } from '../../../../utils/formatters/listings';
import { useCallingUser, UserAvatar } from '../../../users';
import { discardPendingPost, retryPendingPost } from '../../actions/publishPost/publishPost';
import type { PendingPost } from '../../pendingPostStore';
import { preparedDisplayPhoto } from '../../utils/preparePostPhoto/preparePostPhoto';
import { PostPhotoCarousel } from '../PostPhotoCarousel/PostPhotoCarousel';
import { PostPhotoGrid } from '../PostPhotoGrid/PostPhotoGrid';
import '../PostCard/PostCard.css';
import './PendingPostCard.css';

interface PendingPostCardProps {
  pending: PendingPost;
}

/**
 * A post or listing you've just sent, as it'll look, while its photos upload
 * and it's created (from this device). If it fails: why, Retry and Discard.
 */
export function PendingPostCard({ pending }: PendingPostCardProps) {
  const { callingUser } = useCallingUser();
  const profile = callingUser?.profile;
  if (!profile) {
    return null;
  }
  const photos = pending.photos.map(({ photo, caption }) => preparedDisplayPhoto(photo, caption));
  const listing = pending.content.kind === 'listing' ? pending.content.listing : null;
  const text = pending.content.content;
  const isFailed = pending.status === 'failed';

  return (
    <IonCard className="post-card pending-post-card" data-status={pending.status}>
      <IonToolbar className="post-card__header">
        <UserAvatar slot="start" user={profile} />
        <IonLabel>
          <h2>{displayName(profile)}</h2>
          <p className="pending-post-card__status" role="status">
            {isFailed ? (
              <>
                <IonIcon icon={alertCircle} color="danger" aria-hidden="true" /> Couldn't post: {pending.error}
              </>
            ) : (
              <>
                <IonSpinner name="dots" aria-hidden="true" /> Posting…
              </>
            )}
          </p>
        </IonLabel>
      </IonToolbar>

      {listing && <PostPhotoCarousel photos={photos} />}

      <IonCardContent className="post-card__body">
        {listing && (
          <div className="post-card__listing">
            <div className="post-card__listing-title">
              <strong>{listing.title}</strong>
            </div>
            <IonNote className="post-card__price">{listingPrice({ ...listing, postId: pending.id, status: 'available' })}</IonNote>
            <IonNote className="post-card__listing-meta">
              {listingConditionLabels[listing.condition]}
              {listing.isNegotiable && ' · Open to offers'}
            </IonNote>
          </div>
        )}
        {text && <p className="post-card__content">{text}</p>}
        {!listing && photos.length > 0 && (
          <div className="post-card__photos">
            <PostPhotoGrid photos={photos} />
          </div>
        )}
      </IonCardContent>

      {isFailed && (
        <div className="pending-post-card__actions">
          <IonButton size="small" fill="clear" color="medium" onClick={() => discardPendingPost(pending.id)}>
            Discard
          </IonButton>
          <IonButton size="small" onClick={() => retryPendingPost(pending.id)}>
            Retry
          </IonButton>
        </div>
      )}
    </IonCard>
  );
}

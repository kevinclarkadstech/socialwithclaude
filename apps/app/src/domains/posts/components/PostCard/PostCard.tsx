import {
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonIcon,
  IonLabel,
  IonNote,
  IonToolbar,
} from '@ionic/react';
import { bookmark, bookmarkOutline, chatbubbleOutline } from 'ionicons/icons';
import { useNavigate } from 'react-router';
import { UserAvatar } from '../../../users/components/UserAvatar/UserAvatar';
import { timeAgo } from '../../../../common/formatters/dates';
import { displayName } from '../../../../common/formatters/names';
import { listingPrice } from '../../../../common/formatters/prices';
import { listingConditionLabels, listingStatusLabels } from '../../../../common/formatters/listings';
import { useRequireSignIn } from '../../../../common/hooks/useRequireSignIn';
import { usePost } from '../../hooks/usePost';
import { useSavePost } from '../../hooks/useSavePost';
import { useTabHref } from '../../../../navigation';
import { AuthorLink } from '../AuthorLink/AuthorLink';
import { PostMenuButton } from '../PostMenuButton/PostMenuButton';
import { PostPhotoCarousel } from '../PostPhotoCarousel/PostPhotoCarousel';
import { PostPhotoGrid } from '../PostPhotoGrid/PostPhotoGrid';
import './PostCard.css';

interface PostCardProps {
  postId: string;
  /** In a list, tapping the post opens its page; on that page it doesn't. */
  linkToPost?: boolean;
  /** Tapping the author opens their profile; on that profile it doesn't. */
  linkToAuthor?: boolean;
  /** After the post is deleted from its menu, e.g. to leave its page. */
  onDeleted?: () => void;
}

/**
 * A post (or listing) as a card: who and when, the content and photos (a
 * grid for posts, a carousel for listings), and its actions. Saving and
 * reading comments need sign-in.
 */
export function PostCard({ postId, linkToPost = true, linkToAuthor = true, onDeleted }: PostCardProps) {
  const post = usePost(postId);
  const requireSignIn = useRequireSignIn();
  const { setSaved } = useSavePost();
  const navigate = useNavigate();
  const tabHref = useTabHref();
  const openPost = () => navigate(tabHref(`posts/${postId}`));

  if (!post) {
    return null;
  }
  const { creator, listing, viewer } = post;

  return (
    <IonCard className="post-card">
      <IonToolbar className="post-card__header">
        <AuthorLink slot="start" username={creator.username} enabled={linkToAuthor}>
          <UserAvatar user={creator} />
        </AuthorLink>
        <IonLabel>
          <h2>
            <AuthorLink username={creator.username} enabled={linkToAuthor}>
              {displayName(creator)}
            </AuthorLink>
          </h2>
          <p>
            @{creator.username} · <time dateTime={post.createdAt}>{timeAgo(post.createdAt)}</time>
          </p>
        </IonLabel>
        <IonButtons slot="end">
          <PostMenuButton post={post} onDeleted={onDeleted} />
        </IonButtons>
      </IonToolbar>

      {listing && <PostPhotoCarousel media={post.media} />}

      <IonCardContent
        className={linkToPost ? 'post-card__body post-card__body--link' : 'post-card__body'}
        onClick={linkToPost ? openPost : undefined}
      >
        {listing && (
          <div className="post-card__listing" data-listing-status={listing.status}>
            <div className="post-card__listing-title">
              <strong>{listing.title}</strong>
              {listing.status !== 'available' && (
                <IonBadge color={listing.status === 'sold' ? 'medium' : 'warning'}>{listingStatusLabels[listing.status]}</IonBadge>
              )}
            </div>
            <IonNote className="post-card__price">
              {listingPrice(listing)}
            </IonNote>
            <IonNote className="post-card__listing-meta">
              {listingConditionLabels[listing.condition]}
              {listing.isNegotiable && ' · Open to offers'}
            </IonNote>
          </div>
        )}
        {post.content && <p className="post-card__content">{post.content}</p>}
        {!listing && post.media.length > 0 && (
          <div className="post-card__photos">
            <PostPhotoGrid media={post.media} />
          </div>
        )}
      </IonCardContent>

      <IonButtons className="post-card__actions">
        <IonButton
          fill="clear"
          size="small"
          color="medium"
          disabled={!linkToPost}
          onClick={() => requireSignIn(openPost)}
        >
          <IonIcon slot="start" icon={chatbubbleOutline} aria-hidden="true" />
          <span className="visually-hidden">Comments, </span>
          {post.numComments}
        </IonButton>
        <IonButton
          fill="clear"
          size="small"
          color={viewer.hasSaved ? 'primary' : 'medium'}
          data-saved={String(viewer.hasSaved)}
          onClick={() => requireSignIn(() => void setSaved(post, !viewer.hasSaved))}
        >
          <IonIcon slot="start" icon={viewer.hasSaved ? bookmark : bookmarkOutline} aria-hidden="true" />
          {/* Text rather than aria-label: Ionic copies aria-label to its inner button only once. */}
          <span className="visually-hidden">{viewer.hasSaved ? 'Unsave' : 'Save'}, </span>
          {post.numSaves}
        </IonButton>
      </IonButtons>
    </IonCard>
  );
}

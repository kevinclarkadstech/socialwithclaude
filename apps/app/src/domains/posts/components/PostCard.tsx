import {
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
import { UserAvatar } from '../../users/components/UserAvatar';
import { timeAgo } from '../../../common/formatters/dates';
import { displayName } from '../../../common/formatters/names';
import { listingPrice } from '../../../common/formatters/prices';
import { useRequireSignIn } from '../../../common/hooks/useRequireSignIn';
import { usePost } from '../hooks/usePost';
import { useSavePost } from '../hooks/useSavePost';
import { useTabHref } from '../../../navigation';
import { PostMenuButton } from './PostMenuButton';
import './PostCard.css';

interface PostCardProps {
  postId: string;
  /** In a list, tapping the post opens its page; on that page it doesn't. */
  linkToPost?: boolean;
  /** After the post is deleted from its menu, e.g. to leave its page. */
  onDeleted?: () => void;
}

/**
 * A post (or listing) as a card: who and when, the content, and its
 * actions. Saving and reading comments need sign-in.
 */
export function PostCard({ postId, linkToPost = true, onDeleted }: PostCardProps) {
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
        <UserAvatar slot="start" user={creator} />
        <IonLabel>
          <h2>{displayName(creator)}</h2>
          <p>
            @{creator.username} · <time dateTime={post.createdAt}>{timeAgo(post.createdAt)}</time>
          </p>
        </IonLabel>
        <IonButtons slot="end">
          <PostMenuButton post={post} onDeleted={onDeleted} />
        </IonButtons>
      </IonToolbar>

      <IonCardContent
        className={linkToPost ? 'post-card__body post-card__body--link' : 'post-card__body'}
        onClick={linkToPost ? openPost : undefined}
      >
        {listing && (
          <div className="post-card__listing">
            <strong>{listing.title}</strong>
            <IonNote color="primary">
              {listingPrice(listing)}
              {listing.isNegotiable && ' · Negotiable'}
            </IonNote>
          </div>
        )}
        {post.content && <p className="post-card__content">{post.content}</p>}
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

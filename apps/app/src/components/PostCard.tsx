import { IonButton, IonIcon } from '@ionic/react';
import type { Post } from '@myapp/shared/domains';
import { bookmark, bookmarkOutline, chatbubbleOutline } from 'ionicons/icons';
import { useRequireSignIn } from '../auth/SignInContext';
import { useSavePost } from '../hooks/useSavePost';
import { displayName } from '../utils/names';
import { timeAgo } from '../utils/time';
import { UserAvatar } from './UserAvatar';
import './PostCard.css';

function listingPrice(listing: NonNullable<Post['listing']>): string {
  switch (listing.type) {
    case 'fixed':
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(listing.priceCents / 100);
    case 'free':
      return 'Free';
    case 'multiple':
      return 'Multiple items';
  }
}

/** A post (or listing) in a list: who and when, the content, and its counts. Saving needs sign-in. */
export function PostCard({ post }: { post: Post }) {
  const requireSignIn = useRequireSignIn();
  const { setSaved } = useSavePost();
  const { creator, listing } = post;

  return (
    <article className="post-card">
      <header className="post-card__header">
        <UserAvatar user={creator} />
        <div className="post-card__who">
          <span className="post-card__name">{displayName(creator)}</span>
          <span className="post-card__meta">
            @{creator.username} · <time dateTime={post.createdAt}>{timeAgo(post.createdAt)}</time>
          </span>
        </div>
      </header>

      {listing && (
        <div className="post-card__listing">
          <span className="post-card__title">{listing.title}</span>
          <span className="post-card__price">
            {listingPrice(listing)}
            {listing.isNegotiable && ' · Negotiable'}
          </span>
        </div>
      )}
      {post.content && <p className="post-card__content">{post.content}</p>}

      <footer className="post-card__actions">
        <span className="post-card__count" aria-label={`${post.numComments} comments`}>
          <IonIcon icon={chatbubbleOutline} aria-hidden="true" />
          {post.numComments}
        </span>
        <IonButton
          fill="clear"
          size="small"
          data-saved={String(post.viewer.hasSaved)}
          onClick={() => requireSignIn(() => setSaved(post, !post.viewer.hasSaved))}
        >
          <IonIcon slot="start" icon={post.viewer.hasSaved ? bookmark : bookmarkOutline} aria-hidden="true" />
          {/* Text rather than aria-label: Ionic copies aria-label to its inner button only once. */}
          <span className="visually-hidden">{post.viewer.hasSaved ? 'Unsave' : 'Save'}, </span>
          {post.numSaves}
        </IonButton>
      </footer>
    </article>
  );
}

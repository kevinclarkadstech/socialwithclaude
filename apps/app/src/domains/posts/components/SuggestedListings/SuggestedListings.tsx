import type { PostView } from '@myapp/shared/domains';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { RailCard } from '../../../../common/components/RailCard/RailCard';
import { useTabHref } from '../../../../navigation';
import { listingPrice } from '../../../../utils/formatters/prices';
import { useCallingUser } from '../../../users';
import { runGetSuggestedListingsQuery } from '../../operations/runGetSuggestedListingsQuery/runGetSuggestedListingsQuery';
import { postPhotoUrl } from '../../utils/postPhotoUrl/postPhotoUrl';
import './SuggestedListings.css';

/** "Suggested listings" in Marketplace's rail: a grid of small cards (photo, price, title). Nothing if there are none. */
export function SuggestedListings() {
  const { callingUser } = useCallingUser();
  const userId = callingUser?.userId ?? null;
  const navigate = useNavigate();
  const tabHref = useTabHref();
  const [listings, setListings] = useState<PostView[]>([]);

  useEffect(() => {
    let cancelled = false;
    void runGetSuggestedListingsQuery()
      .catch(() => null)
      .then((result) => {
        if (!cancelled) {
          setListings(result?.ok ? result.value : []);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (listings.length === 0) {
    return null;
  }
  return (
    <RailCard title="Suggested listings">
      <ul className="suggested-listings">
        {listings.map((post) => {
          const photo = post.media[0];
          const href = tabHref(`posts/${post.id}`);
          return (
            <li key={post.id}>
              <a
                href={href}
                className="suggested-listings__item"
                onClick={(event) => {
                  event.preventDefault();
                  navigate(href);
                }}
              >
                <span className="suggested-listings__photo">
                  {photo && <img src={postPhotoUrl({ media: photo, size: 320 })} alt="" loading="lazy" />}
                </span>
                {post.listing && <strong>{listingPrice(post.listing)}</strong>}
                <span className="suggested-listings__title">{post.listing?.title ?? post.content}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </RailCard>
  );
}

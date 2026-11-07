import type { ListingStatus } from '@myapp/shared/domains';
import { useCallback, useEffect } from 'react';
import { listingListKey } from '../listingLists';
import { onPostCreated } from '../postEvents';
import { postStore } from '../postStore';
import { runGetPostListingsQuery } from '../operations/runGetPostListingsQuery';
import { useEntityList } from '../../../lib/stores/useEntityList';

/** The Marketplace: listings with `status` (or all of them for null), newest first, a page at a time. */
export function useListings({ status }: { status: ListingStatus | null }) {
  const key = listingListKey(status);

  // A listing created on this device goes straight to the top, if it belongs here.
  useEffect(
    () =>
      onPostCreated((post) => {
        if (!post.listing || (status !== null && post.listing.status !== status)) {
          return;
        }
        postStore.updateList(key, (list) => ({ ...list, ids: [post.id, ...list.ids.filter((id) => id !== post.id)] }));
      }),
    [key, status],
  );

  const fetchPage = useCallback(({ cursor }: { cursor: string | null }) => runGetPostListingsQuery({ status, cursor }), [status]);
  return useEntityList(postStore, key, fetchPage);
}

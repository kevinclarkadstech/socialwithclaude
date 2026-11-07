import { listingStatuses, type ListingStatus } from '@myapp/shared/domains';

/** The postStore list of listings with `status`, or of every listing for null. */
export const listingListKey = (status: ListingStatus | null) => `listings:${status ?? 'all'}`;

/** Every listing list a listing with `status` doesn't belong in. */
export const otherListingListKeys = (status: ListingStatus) =>
  listingStatuses.filter((other) => other !== status).map(listingListKey);

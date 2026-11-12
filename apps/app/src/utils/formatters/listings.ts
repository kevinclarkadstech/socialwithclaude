import type { ListingCondition, ListingStatus, ListingType } from '@myapp/shared/domains';

/** How each condition reads on a listing. */
export const listingConditionLabels: Record<ListingCondition, string> = {
  new: 'New',
  used: 'Used',
};

/** How each status reads: as a badge on a listing, and as a Marketplace filter. */
export const listingStatusLabels: Record<ListingStatus, string> = {
  available: 'Available',
  pending: 'Pending',
  sold: 'Sold',
};

/** How each kind of price reads in the listing form. */
export const listingTypeLabels: Record<ListingType, string> = {
  fixed: 'Price',
  free: 'Free',
  multiple: 'Multiple',
};

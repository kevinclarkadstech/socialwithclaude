import type { PostListing } from '@myapp/shared/domains';

const currency = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });

/** "$320.00", "Free" or "Multiple items". */
export function listingPrice(listing: PostListing): string {
  switch (listing.type) {
    case 'fixed':
      return currency.format(listing.priceCents / 100);
    case 'free':
      return 'Free';
    case 'multiple':
      return 'Multiple items';
  }
}

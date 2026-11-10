import type { ListingCondition, ListingPrice, ListingStatus, ListingType, PostView } from '@myapp/shared/domains';
import { useState } from 'react';
import { newId } from '../../../lib/ids';
import { publishPost } from '../actions/publishPost';
import { warnAboutDroppedPhotos } from '../utils/droppedPhotosWarning';
import { updatePost } from '../actions/updatePost';
import { parsePriceCents, priceFieldValue } from '../listingPrices';
import { usePostPhotos } from './usePostPhotos';

/** What's wrong with the form, by field, after trying to submit. */
interface ListingFormErrors {
  title?: string;
  price?: string;
  description?: string;
}

/**
 * Listing something for sale, or editing `post` (a listing): the fields as
 * typed, its photos (uploaded as they're picked), checking them, and saving.
 * A new listing is sent in the background (it shows at the top straight
 * away); an edit saves before closing. The description is also the post's
 * text in the feed. Text is trimmed only when it's sent.
 */
export function useComposeListing({ post, onDismiss }: { post?: PostView; onDismiss: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceType, setPriceType] = useState<ListingType>('fixed');
  const [price, setPrice] = useState('');
  const [isNegotiable, setIsNegotiable] = useState(false);
  const [condition, setCondition] = useState<ListingCondition>('used');
  const [status, setStatus] = useState<ListingStatus>('available');
  const [errors, setErrors] = useState<ListingFormErrors>({});
  const [postId, setPostId] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const photos = usePostPhotos();
  const canSubmit = !isBusy && !photos.isBusy && !photos.hasFailed;

  /** Starts from the listing's details when editing, or a blank form. */
  function reset() {
    const listing = post?.listing;
    setTitle(listing?.title ?? '');
    setDescription(listing?.description ?? '');
    setPriceType(listing?.type ?? 'fixed');
    setPrice(listing?.type === 'fixed' ? priceFieldValue(listing.priceCents) : '');
    setIsNegotiable(listing?.isNegotiable ?? false);
    setCondition(listing?.condition ?? 'used');
    setStatus(listing?.status ?? 'available');
    setErrors({});
    const id = post?.id ?? newId();
    setPostId(id);
    photos.reset({ id, media: post?.media });
  }

  /** The price as the API takes it, or null if a fixed price isn't a valid amount. */
  function listingPrice(): ListingPrice | null {
    if (priceType !== 'fixed') {
      return { type: priceType };
    }
    const priceCents = parsePriceCents(price);
    if (priceCents === null) {
      return null;
    }
    return { type: 'fixed', priceCents };
  }

  async function submit() {
    const priced = listingPrice();
    const formErrors: ListingFormErrors = {
      title: title.trim() === '' ? 'Add a title' : undefined,
      price: priced === null ? 'Enter a price, like 25 or 25.50' : undefined,
      description: description.trim() === '' ? 'Describe what you’re selling' : undefined,
    };
    setErrors(formErrors);
    if (priced === null || formErrors.title || formErrors.description) {
      return;
    }

    // One text for both: the listing's description and the post's text in the feed.
    const content = description.trim();
    const listing = {
      title: title.trim(),
      description: content,
      condition,
      // Only a fixed price can be negotiable.
      isNegotiable: priced.type === 'fixed' && isNegotiable,
      ...priced,
    };
    if (!post) {
      publishPost({ id: postId, content: { kind: 'listing', content, listing }, photos: photos.handOff() });
      onDismiss();
      return;
    }
    setIsBusy(true);
    try {
      const media = photos.media;
      const result = await updatePost({ id: post.id, content, media, listing: { ...listing, status } });
      if (result.ok) {
        warnAboutDroppedPhotos({ sent: media, saved: result.value });
        onDismiss();
      }
    } finally {
      setIsBusy(false);
    }
  }

  /** A field's error goes as soon as it's changed, rather than waiting for the next submit. */
  function clearError(field: keyof ListingFormErrors) {
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  return {
    fields: { title, description, priceType, price, isNegotiable, condition, status },
    set: {
      setTitle: (value: string) => {
        setTitle(value);
        clearError('title');
      },
      setDescription: (value: string) => {
        setDescription(value);
        clearError('description');
      },
      setPriceType: (value: ListingType) => {
        setPriceType(value);
        clearError('price');
      },
      setPrice: (value: string) => {
        setPrice(value);
        clearError('price');
      },
      setIsNegotiable,
      setCondition,
      setStatus,
    },
    errors,
    photos,
    isBusy,
    canSubmit,
    reset,
    submit,
  };
}

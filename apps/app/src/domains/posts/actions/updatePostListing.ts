import type { UpdatePostListingMutationInput } from '@myapp/shared/domains';
import { runOrToast } from '../../../lib/api/runOrToast';
import { otherListingListKeys } from '../listingLists';
import { postStore } from '../postStore';
import { runUpdatePostListingMutation } from '../operations/runUpdatePostListingMutation';

/**
 * Saves an edit to one of your listings. A listing marked sold leaves the
 * "Available" list (and so on) straight away. A failure has been shown in a toast.
 */
export async function updatePostListing(listing: UpdatePostListingMutationInput) {
  const result = await runOrToast(() => runUpdatePostListingMutation(listing));
  if (result.ok) {
    postStore.setItems([result.value]);
    for (const key of otherListingListKeys(listing.status)) {
      postStore.updateList(key, (list) => ({ ...list, ids: list.ids.filter((id) => id !== listing.id) }));
    }
  }
  return result;
}

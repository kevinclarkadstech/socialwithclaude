import type { UpdatePostMutationInput } from '@myapp/shared/domains';
import { runOrToast } from '../../../../lib/api/runOrToast';
import { otherListingListKeys } from '../../listingLists';
import { postStore } from '../../postStore';
import { runUpdatePostMutation } from '../../operations/runUpdatePostMutation/runUpdatePostMutation';

/**
 * Saves an edit to one of your posts: its text and photos, and a listing's
 * details. A listing marked sold leaves the "Available" list (and so on)
 * straight away. A failure has been shown in a toast.
 */
export async function updatePost(post: UpdatePostMutationInput) {
  const result = await runOrToast(() => runUpdatePostMutation(post));
  if (result.ok) {
    postStore.setItems([result.value]);
    if (post.listing) {
      for (const key of otherListingListKeys(post.listing.status)) {
        postStore.updateList(key, (list) => ({ ...list, ids: list.ids.filter((id) => id !== post.id) }));
      }
    }
  }
  return result;
}

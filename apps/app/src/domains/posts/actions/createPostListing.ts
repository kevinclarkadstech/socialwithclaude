import type { CreatePostListingMutationInput } from '@myapp/shared/domains';
import { newId } from '../../../lib/ids';
import { runOrToast } from '../../../lib/api/runOrToast';
import { emitPostCreated } from '../postEvents';
import { postStore } from '../postStore';
import { runCreatePostListingMutation } from '../operations/runCreatePostListingMutation';

/** Omit for each kind of price in turn (a plain Omit would merge them and lose which fields go with which). */
type WithoutId<T> = T extends unknown ? Omit<T, 'id'> : never;

/** Lists something for sale, and adds it to the feed and the marketplace. A failure has been shown in a toast. */
export async function createPostListing(listing: WithoutId<CreatePostListingMutationInput>) {
  const result = await runOrToast(() => runCreatePostListingMutation({ ...listing, id: newId() }));
  if (result.ok) {
    postStore.setItems([result.value]);
    emitPostCreated(result.value);
  }
  return result;
}

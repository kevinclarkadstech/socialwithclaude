import { runOrToast } from '../../../lib/api/runOrToast';
import { newId } from '../../../lib/ids';
import { runCreatePostListingMutation } from '../operations/runCreatePostListingMutation';
import { runCreatePostMutation } from '../operations/runCreatePostMutation';
import { emitPostCreated } from '../postEvents';
import { pendingPostStore, type PendingPost } from '../pendingPostStore';
import { postStore } from '../postStore';
import { uploadPostPhotos } from './uploadPostPhotos';

/**
 * Posts something new (a post or a listing) with its photos, without making
 * anyone wait: it shows at the top of the feed straight away while its
 * photos upload and it's created, then the real post takes its place. If it
 * fails, it stays with the reason, to retry or discard (and a toast says so).
 */
export function publishPost({ content, photos }: Pick<PendingPost, 'content' | 'photos'>) {
  const pending: PendingPost = { id: newId(), content, photos, status: 'sending', error: null };
  pendingPostStore.add(pending);
  void send(pending.id);
}

/** Tries a failed post again: photos already uploaded aren't uploaded again, and the same id can't make a second post. */
export function retryPendingPost(id: string) {
  void send(id);
}

/** Gives up on a failed post. */
export function discardPendingPost(id: string) {
  const pending = pendingPostStore.get(id);
  if (pending) {
    release(pending);
    pendingPostStore.remove(id);
  }
}

async function send(id: string) {
  const pending = pendingPostStore.get(id);
  if (!pending) {
    return;
  }
  pendingPostStore.update(id, { status: 'sending', error: null });

  const result = await runOrToast(async () => {
    const uploaded = await uploadPostPhotos({ photos: pending.photos.map(({ photo }) => photo) });
    if (!uploaded.ok) {
      return uploaded;
    }
    const media = pending.photos.map(({ photo, caption }) => ({ id: photo.mediaId, caption }));
    return pending.content.kind === 'post'
      ? runCreatePostMutation({ id, content: pending.content.content, media })
      : runCreatePostListingMutation({ ...pending.content.listing, id, media });
  });

  if (!result.ok) {
    pendingPostStore.update(id, { status: 'failed', error: result.error.message ?? "Couldn't post" });
    return;
  }
  // The real post goes in before the stand-in leaves, so nothing jumps.
  postStore.setItems([result.value]);
  emitPostCreated(result.value);
  release(pending);
  pendingPostStore.remove(id);
}

/** Frees the photos kept in memory for it. */
function release(pending: PendingPost) {
  for (const { photo } of pending.photos) {
    URL.revokeObjectURL(photo.previewUrl);
  }
}

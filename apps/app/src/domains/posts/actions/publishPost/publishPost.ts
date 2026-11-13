import { runOrToast } from '../../../../lib/api/runOrToast';
import { runCreatePostMutation } from '../../operations/runCreatePostMutation/runCreatePostMutation';
import { emitPostCreated } from '../../postEvents';
import { pendingPostStore, type PendingPost } from '../../pendingPostStore';
import { postStore } from '../../postStore';
import { warnAboutDroppedPhotos } from '../../utils/droppedPhotosWarning/droppedPhotosWarning';
import { preparedPostMedia } from '../../utils/preparePostPhoto/preparePostPhoto';
import { getCallingUser } from '../../../users/callingUserStore';

/**
 * Posts something new (a post or a listing) without making anyone wait: it
 * shows at the top of the feed straight away while it's saved (its photos
 * were uploaded as they were picked, and saving publishes them), then the
 * real post takes its place. A photo that couldn't be added is left off,
 * with a warning. If saving fails, it stays with the reason, to retry or
 * discard (and a toast says so).
 */
export function publishPost(pending: Pick<PendingPost, 'id' | 'content' | 'photos'>) {
  pendingPostStore.add({ ...pending, status: 'sending', error: null });
  void send(pending.id);
}

/** Tries a failed post again: the same id can't make a second post. */
export function retryPendingPost(id: string) {
  void send(id);
}

/** Gives up on a failed post. Its uploads expire on their own. */
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

  const caller = await getCallingUser();
  const media = pending.photos.map(({ photo, caption }) => preparedPostMedia(photo, { postId: id, userId: caller?.userId ?? '', caption }));
  const listing = pending.content.kind === 'listing' ? pending.content.listing : undefined;
  const result = await runOrToast(() => runCreatePostMutation({ id, content: pending.content.content, media, listing }));

  if (!result.ok) {
    pendingPostStore.update(id, { status: 'failed', error: result.error.message ?? "Couldn't post" });
    return;
  }
  // The real post goes in before the stand-in leaves, so nothing jumps.
  postStore.setItems([result.value]);
  emitPostCreated(result.value);
  release(pending);
  pendingPostStore.remove(id);
  warnAboutDroppedPhotos({ sent: media, saved: result.value });
}

/** Frees the photos kept in memory for it. */
function release(pending: PendingPost) {
  for (const { photo } of pending.photos) {
    URL.revokeObjectURL(photo.previewUrl);
  }
}

import type { Post, PostMedia } from '@myapp/shared/domains';
import { showErrorToast } from '../../../lib/toasts';

/** Says so if saving left off photos that were sent (one that didn't finish uploading, or wasn't a usable image). */
export function warnAboutDroppedPhotos({ sent, saved }: { sent: Pick<PostMedia, 'id'>[]; saved: Post }) {
  const dropped = sent.filter((item) => !saved.media.some((media) => media.id === item.id)).length;
  if (dropped > 0) {
    void showErrorToast(dropped === 1 ? "A photo couldn't be added. Edit the post to try again." : `${dropped} photos couldn't be added. Edit the post to try again.`);
  }
}

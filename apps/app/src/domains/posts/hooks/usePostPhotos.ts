import { maxPostPhotos, postPhotoSizes, type PostMedia, type PostMediaChoice } from '@myapp/shared/domains';
import { useRef, useState } from 'react';
import { showErrorToast } from '../../../lib/toasts';
import { uploadPostPhoto } from '../actions/uploadPostPhoto';
import { postPhotoUrl } from '../utils/postPhotoUrl';

/** A photo in the composer: one already on the post, or one chosen now (uploading, ready or failed). */
export interface ComposerPhoto {
  /** Stays the same while it uploads, for React lists and for changing it. */
  key: string;
  /** What to show for it: the chosen file itself, or the post's small size. */
  previewUrl: string;
  status: 'uploading' | 'ready' | 'failed';
  /** Once uploaded (or already on the post). */
  media?: PostMedia;
  /** Kept for trying the upload again. */
  file?: File;
  caption: string;
}

let nextKey = 0;

/**
 * The photos of a post or listing being written or edited: adding (each
 * uploads straight away, one at a time), removing, reordering and
 * captioning them, and what to send when it's saved.
 */
export function usePostPhotos() {
  const [photos, setPhotos] = useState<ComposerPhoto[]>([]);
  const [initial, setInitial] = useState<PostMediaChoice[]>([]);
  // Uploads run one after another: resizing several big photos at once is heavy on a phone.
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  function update(key: string, change: Partial<ComposerPhoto>) {
    setPhotos((current) => current.map((photo) => (photo.key === key ? { ...photo, ...change } : photo)));
  }

  function upload(key: string, file: File) {
    queue.current = queue.current.then(async () => {
      const result = await uploadPostPhoto({ photo: file });
      if (result.ok) {
        update(key, { status: 'ready', media: result.value });
      } else {
        update(key, { status: 'failed' });
      }
    });
  }

  /** Starts from the post's photos when editing, or none. */
  function reset(media: PostMedia[] = []) {
    for (const photo of photos) {
      if (photo.file) {
        URL.revokeObjectURL(photo.previewUrl);
      }
    }
    setPhotos(media.map((item) => ({
      key: item.id,
      previewUrl: postPhotoUrl({ media: item, size: postPhotoSizes[0] }),
      status: 'ready',
      media: item,
      caption: item.caption ?? '',
    })));
    setInitial(media.map(({ id, caption }) => ({ id, caption })));
  }

  function add(files: File[]) {
    const room = maxPostPhotos - photos.length;
    if (files.length > room) {
      void showErrorToast(`A post can have up to ${maxPostPhotos} photos`);
    }
    const added = files.slice(0, Math.max(0, room)).map((file): ComposerPhoto => ({
      key: `new-${nextKey++}`,
      previewUrl: URL.createObjectURL(file),
      status: 'uploading',
      file,
      caption: '',
    }));
    setPhotos((current) => [...current, ...added]);
    for (const photo of added) {
      upload(photo.key, photo.file!);
    }
  }

  function remove(key: string) {
    const photo = photos.find((candidate) => candidate.key === key);
    if (photo?.file) {
      URL.revokeObjectURL(photo.previewUrl);
    }
    setPhotos((current) => current.filter((candidate) => candidate.key !== key));
  }

  function retry(key: string) {
    const photo = photos.find((candidate) => candidate.key === key);
    if (photo?.file) {
      update(key, { status: 'uploading' });
      upload(key, photo.file);
    }
  }

  function move(from: number, to: number) {
    setPhotos((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved!);
      return next;
    });
  }

  function setCaption(key: string, caption: string) {
    update(key, { caption });
  }

  /** The photos to save, in order (only uploaded ones; saving waits for the rest). */
  const choices: PostMediaChoice[] = photos
    .filter((photo) => photo.media)
    .map((photo) => ({ id: photo.media!.id, caption: photo.caption.trim() || null }));
  const isUploading = photos.some((photo) => photo.status === 'uploading');
  const hasFailed = photos.some((photo) => photo.status === 'failed');
  const isChanged = JSON.stringify(choices) !== JSON.stringify(initial) || photos.length !== initial.length;

  return { photos, choices, isUploading, hasFailed, isChanged, reset, add, remove, retry, move, setCaption };
}

export type PostPhotos = ReturnType<typeof usePostPhotos>;

import { maxPostPhotos, postPhotoSizes, type PostMedia, type PostMediaChoice } from '@myapp/shared/domains';
import { useRef, useState } from 'react';
import { showErrorToast } from '../../../lib/toasts';
import type { PendingPost } from '../pendingPostStore';
import { postPhotoUrl } from '../utils/postPhotoUrl';
import { preparePostPhoto, type PreparedPostPhoto } from '../utils/preparePostPhoto';

/** A photo in the composer: one already on the post, or one picked now (being resized, ready to send, or unusable). */
export type ComposerPhoto =
  | { key: string; kind: 'published'; media: PostMedia; previewUrl: string; caption: string }
  | { key: string; kind: 'new'; status: 'preparing' | 'ready' | 'failed'; previewUrl: string; prepared?: PreparedPostPhoto; caption: string };

let nextKey = 0;

/**
 * The photos of a post or listing being written or edited: adding (each is
 * resized on the device straight away, one at a time; nothing uploads until
 * it's sent), removing, reordering and captioning them, and what to send.
 */
export function usePostPhotos() {
  const [photos, setPhotos] = useState<ComposerPhoto[]>([]);
  const [initial, setInitial] = useState<PostMediaChoice[]>([]);
  // Resizing several big photos at once is heavy on a phone.
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  function update(key: string, change: Partial<Extract<ComposerPhoto, { kind: 'new' }>>) {
    setPhotos((current) => current.map((photo) => (photo.key === key && photo.kind === 'new' ? { ...photo, ...change } : photo)));
  }

  /** Frees what a photo holds in memory (the file, and its sizes unless they've gone to a post being sent). */
  function release(photo: ComposerPhoto, { keepPrepared = false } = {}) {
    if (photo.kind !== 'new') {
      return;
    }
    if (photo.prepared && !keepPrepared) {
      URL.revokeObjectURL(photo.prepared.previewUrl);
    }
    if (photo.previewUrl !== photo.prepared?.previewUrl) {
      URL.revokeObjectURL(photo.previewUrl);
    }
  }

  /** Starts from the post's photos when editing, or none. */
  function reset(media: PostMedia[] = []) {
    for (const photo of photos) {
      release(photo);
    }
    setPhotos(media.map((item) => ({
      key: item.id,
      kind: 'published',
      media: item,
      previewUrl: postPhotoUrl({ media: item, size: postPhotoSizes[0] }),
      caption: item.caption ?? '',
    })));
    setInitial(media.map(({ id, caption }) => ({ id, caption })));
  }

  function add(files: File[]) {
    const room = maxPostPhotos - photos.length;
    if (files.length > room) {
      void showErrorToast(`A post can have up to ${maxPostPhotos} photos`);
    }
    const added = files.slice(0, Math.max(0, room)).map((file) => ({
      file,
      photo: { key: `new-${nextKey++}`, kind: 'new' as const, status: 'preparing' as const, previewUrl: URL.createObjectURL(file), caption: '' },
    }));
    setPhotos((current) => [...current, ...added.map(({ photo }) => photo)]);
    for (const { file, photo } of added) {
      queue.current = queue.current.then(async () => {
        try {
          const prepared = await preparePostPhoto(file);
          URL.revokeObjectURL(photo.previewUrl);
          update(photo.key, { status: 'ready', prepared, previewUrl: prepared.previewUrl });
        } catch {
          update(photo.key, { status: 'failed' });
        }
      });
    }
  }

  function remove(key: string) {
    const photo = photos.find((candidate) => candidate.key === key);
    if (photo) {
      release(photo);
    }
    setPhotos((current) => current.filter((candidate) => candidate.key !== key));
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
    setPhotos((current) => current.map((photo) => (photo.key === key ? { ...photo, caption } : photo)));
  }

  /**
   * Gives the picked photos to a post being sent (it frees them once it's
   * posted or discarded), and empties the composer.
   */
  function handOff(): PendingPost['photos'] {
    const sent = photos.flatMap((photo) =>
      photo.kind === 'new' && photo.prepared ? [{ photo: photo.prepared, caption: photo.caption.trim() || null }] : [],
    );
    for (const photo of photos) {
      release(photo, { keepPrepared: true });
    }
    setPhotos([]);
    return sent;
  }

  /** The photos to save, in order: each one's id (picked ones have theirs already) and caption. */
  const choices: PostMediaChoice[] = photos.flatMap((photo) => {
    const id = photo.kind === 'published' ? photo.media.id : photo.prepared?.mediaId;
    return id ? [{ id, caption: photo.caption.trim() || null }] : [];
  });
  /** Picked photos to upload before saving. */
  const newPhotos: PreparedPostPhoto[] = photos.flatMap((photo) => (photo.kind === 'new' && photo.prepared ? [photo.prepared] : []));
  const isPreparing = photos.some((photo) => photo.kind === 'new' && photo.status === 'preparing');
  const hasFailed = photos.some((photo) => photo.kind === 'new' && photo.status === 'failed');
  const isChanged = JSON.stringify(choices) !== JSON.stringify(initial) || photos.length !== initial.length;

  return { photos, choices, newPhotos, isPreparing, hasFailed, isChanged, reset, add, remove, move, setCaption, handOff };
}

export type PostPhotos = ReturnType<typeof usePostPhotos>;

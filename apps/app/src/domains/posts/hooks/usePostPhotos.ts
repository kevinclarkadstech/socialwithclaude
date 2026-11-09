import { maxPostPhotos, postPhotoSizes, type PostMedia, type PostMediaFields } from '@myapp/shared/domains';
import { useRef, useState } from 'react';
import { runOrToast } from '../../../lib/api/runOrToast';
import { showErrorToast } from '../../../lib/toasts';
import { uploadPostPhotos } from '../actions/uploadPostPhotos';
import type { PendingPost } from '../pendingPostStore';
import { postPhotoUrl } from '../utils/postPhotoUrl';
import { preparePostPhoto, type PreparedPostPhoto } from '../utils/preparePostPhoto';

/** A photo in the composer: one already on the post, or one picked now (being resized, uploading, ready, or failed). */
export type ComposerPhoto =
  | { key: string; kind: 'published'; media: PostMedia; previewUrl: string; caption: string }
  | {
      key: string;
      kind: 'new';
      status: 'preparing' | 'uploading' | 'ready' | 'failed';
      previewUrl: string;
      prepared?: PreparedPostPhoto;
      caption: string;
    };

type NewPhoto = Extract<ComposerPhoto, { kind: 'new' }>;

let nextKey = 0;

/**
 * The photos of a post or listing being written or edited: adding (each is
 * resized on the device and uploaded straight away, so saving is quick),
 * removing, reordering, captioning, and trying a failed upload again.
 * Saving the post publishes them.
 */
export function usePostPhotos() {
  const [photos, setPhotos] = useState<ComposerPhoto[]>([]);
  const [initial, setInitial] = useState<string>('[]');
  // The post they're for: uploads go under its id.
  const postId = useRef('');
  // Resizing several big photos at once is heavy on a phone, so picks are handled one after another.
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  function update(key: string, change: Partial<NewPhoto>) {
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

  /** Starts on a post: the one being edited (with its photos), or a new one's id. */
  function reset({ id, media = [] }: { id: string; media?: PostMedia[] }) {
    for (const photo of photos) {
      release(photo);
    }
    postId.current = id;
    setPhotos(media.map((item) => ({
      key: item.id,
      kind: 'published',
      media: item,
      previewUrl: postPhotoUrl({ media: item, size: postPhotoSizes[0] }),
      caption: item.caption ?? '',
    })));
    setInitial(JSON.stringify(media.map(({ id: mediaId, caption }) => ({ id: mediaId, caption }))));
  }

  /** Uploads prepared photos (one call for their upload URLs), marking each ready or failed. */
  async function upload(batch: { key: string; prepared: PreparedPostPhoto }[]) {
    for (const { key } of batch) {
      update(key, { status: 'uploading' });
    }
    const result = await runOrToast(() => uploadPostPhotos({ postId: postId.current, photos: batch.map(({ prepared }) => prepared) }));
    for (const { key, prepared } of batch) {
      const uploaded = result.ok && result.value.uploadedIds.includes(prepared.mediaId);
      update(key, { status: uploaded ? 'ready' : 'failed' });
    }
    if (result.ok && result.value.uploadedIds.length < batch.length) {
      void showErrorToast("A photo didn't upload. Tap it to try again.");
    }
  }

  function add(files: File[]) {
    const room = maxPostPhotos - photos.length;
    if (files.length > room) {
      void showErrorToast(`A post can have up to ${maxPostPhotos} photos`);
    }
    const added: NewPhoto[] = files.slice(0, Math.max(0, room)).map((file) => ({
      key: `new-${nextKey++}`,
      kind: 'new',
      status: 'preparing',
      previewUrl: URL.createObjectURL(file),
      caption: '',
    }));
    setPhotos((current) => [...current, ...added]);
    const picked = files.slice(0, added.length);
    queue.current = queue.current.then(async () => {
      const ready: { key: string; prepared: PreparedPostPhoto }[] = [];
      for (const [index, photo] of added.entries()) {
        try {
          const prepared = await preparePostPhoto(picked[index]!);
          URL.revokeObjectURL(photo.previewUrl);
          update(photo.key, { prepared, previewUrl: prepared.previewUrl });
          ready.push({ key: photo.key, prepared });
        } catch {
          update(photo.key, { status: 'failed' });
        }
      }
      if (ready.length > 0) {
        await upload(ready);
      }
    });
  }

  /** Tries a failed photo again: resized ones upload again; ones that couldn't be read can only be removed. */
  function retry(key: string) {
    const photo = photos.find((candidate) => candidate.key === key);
    if (photo?.kind === 'new' && photo.status === 'failed' && photo.prepared) {
      const prepared = photo.prepared;
      queue.current = queue.current.then(() => upload([{ key, prepared }]));
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

  /** The photos to save, in order, as the post's mutation takes them. */
  const media: PostMediaFields[] = photos.flatMap((photo): PostMediaFields[] => {
    const caption = photo.caption.trim() || null;
    if (photo.kind === 'published') {
      const { id, width, height, placeholder } = photo.media;
      return [{ id, caption, width, height, placeholder }];
    }
    if (photo.status === 'ready' && photo.prepared) {
      const { mediaId, width, height, placeholder } = photo.prepared;
      return [{ id: mediaId, caption, width, height, placeholder }];
    }
    return [];
  });

  /**
   * Gives the picked photos to a post being sent (it shows them, and frees
   * them once it's posted or discarded), and empties the composer.
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

  const isBusy = photos.some((photo) => photo.kind === 'new' && (photo.status === 'preparing' || photo.status === 'uploading'));
  const hasFailed = photos.some((photo) => photo.kind === 'new' && photo.status === 'failed');
  const isChanged = JSON.stringify(media.map(({ id, caption }) => ({ id, caption }))) !== initial || photos.length !== media.length;

  return { photos, media, isBusy, hasFailed, isChanged, reset, add, retry, remove, move, setCaption, handOff };
}

export type PostPhotos = ReturnType<typeof usePostPhotos>;

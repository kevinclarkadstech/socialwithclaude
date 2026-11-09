import {
  IonButton,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  IonReorder,
  IonReorderGroup,
  IonSpinner,
} from '@ionic/react';
import { maxPhotoCaptionLength, maxPostPhotos } from '@myapp/shared/domains';
import { alertCircle, closeOutline, imagesOutline } from 'ionicons/icons';
import { useRef } from 'react';
import type { PostPhotos } from '../../hooks/usePostPhotos';
import './PostPhotosField.css';

interface PostPhotosFieldProps {
  photos: PostPhotos;
}

/**
 * A post's or listing's photos in the composer: add (each is resized on the
 * device straight away; they upload when the post is sent), caption, drag
 * to reorder and remove.
 */
export function PostPhotosField({ photos }: PostPhotosFieldProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const count = photos.photos.length;

  return (
    <div className="post-photos-field">
      {count > 0 && (
        <IonList lines="full" className="post-photos-field__list">
          <IonReorderGroup
            disabled={count < 2}
            onIonReorderEnd={(event) => {
              photos.move(event.detail.from, event.detail.to);
              // The list is drawn from state, so Ionic shouldn't move the item itself.
              event.detail.complete(false);
            }}
          >
            {photos.photos.map((photo, index) => {
              const status = photo.kind === 'new' ? photo.status : 'ready';
              return (
              <IonItem key={photo.key} className="post-photos-field__item" data-status={status}>
                <span slot="start" className="post-photos-field__thumb">
                  <img src={photo.previewUrl} alt={`Photo ${index + 1}`} />
                  {status === 'preparing' && <IonSpinner name="crescent" aria-label="Preparing" />}
                  {status === 'failed' && <IonIcon icon={alertCircle} color="danger" aria-hidden="true" />}
                </span>
                <IonInput
                  aria-label={`Caption for photo ${index + 1}`}
                  placeholder={status === 'failed' ? "This photo couldn't be read. Remove it" : 'Add a caption'}
                  disabled={status === 'failed'}
                  maxlength={maxPhotoCaptionLength}
                  value={photo.caption}
                  onIonInput={(event) => photos.setCaption(photo.key, event.detail.value ?? '')}
                />
                <IonButton
                  slot="end"
                  fill="clear"
                  color="medium"
                  className="post-photos-field__remove"
                  onClick={() => photos.remove(photo.key)}
                >
                  <IonIcon slot="icon-only" icon={closeOutline} aria-hidden="true" />
                  <span className="visually-hidden">Remove photo {index + 1}</span>
                </IonButton>
                {count > 1 && <IonReorder slot="end" />}
              </IonItem>
              );
            })}
          </IonReorderGroup>
        </IonList>
      )}

      {count < maxPostPhotos && (
        <IonButton fill="outline" size="small" className="post-photos-field__add" onClick={() => fileInput.current?.click()}>
          <IonIcon slot="start" icon={imagesOutline} aria-hidden="true" />
          {count === 0 ? 'Add photos' : `Add more (${count}/${maxPostPhotos})`}
        </IonButton>
      )}
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          // Choosing the same file again should still count as a change.
          event.target.value = '';
          if (files.length > 0) {
            photos.add(files);
          }
        }}
      />
    </div>
  );
}

import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonModal, IonTitle, IonToolbar } from '@ionic/react';
import { chevronBack, chevronForward, close } from 'ionicons/icons';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { thumbHashDataUrl } from '../../../lib/images/thumbHash';
import { closePhotoViewer, photoViewerStore } from './photoViewerStore';
import './PhotoViewer.css';

/**
 * Photos full screen, one at a time with their captions: swipe, use the
 * arrows, or the arrow keys. Mounted once in the app shell and opened with
 * openPhotoViewer.
 */
export function PhotoViewer() {
  const { photos, index: startIndex, isOpen } = useSyncExternalStore(photoViewerStore.subscribe, photoViewerStore.get);
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(startIndex);

  function scrollTo(target: number, behavior: ScrollBehavior = 'smooth') {
    const element = track.current;
    if (!element) {
      return;
    }
    const clamped = Math.max(0, Math.min(photos.length - 1, target));
    element.scrollTo({ left: clamped * element.clientWidth, behavior });
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'ArrowRight') {
        scrollTo(index + 1);
      } else if (event.key === 'ArrowLeft') {
        scrollTo(index - 1);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const caption = photos[index]?.caption;

  return (
    <IonModal
      isOpen={isOpen}
      className="photo-viewer"
      onWillPresent={() => setIndex(startIndex)}
      onDidPresent={() => scrollTo(startIndex, 'instant')}
      onDidDismiss={closePhotoViewer}
    >
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={closePhotoViewer}>
              <IonIcon slot="icon-only" icon={close} aria-hidden="true" />
              <span className="visually-hidden">Close</span>
            </IonButton>
          </IonButtons>
          {photos.length > 1 && (
            <IonTitle className="photo-viewer__count">
              {index + 1} of {photos.length}
            </IonTitle>
          )}
        </IonToolbar>
      </IonHeader>
      <IonContent scrollY={false} className="photo-viewer__content">
        <div
          ref={track}
          className="photo-viewer__track"
          onScroll={(event) => {
            const element = event.currentTarget;
            setIndex(Math.round(element.scrollLeft / Math.max(1, element.clientWidth)));
          }}
        >
          {photos.map((photo, photoIndex) => {
            const placeholder = photo.placeholder ? thumbHashDataUrl(photo.placeholder) : null;
            return (
              <figure key={photo.key} className="photo-viewer__slide" aria-label={`Photo ${photoIndex + 1} of ${photos.length}`}>
                <img
                  src={photo.src}
                  srcSet={photo.srcSet}
                  sizes="100vw"
                  width={photo.width}
                  height={photo.height}
                  alt={photo.caption ?? ''}
                  decoding="async"
                  style={placeholder ? { backgroundImage: `url(${placeholder})` } : undefined}
                />
              </figure>
            );
          })}
        </div>
        {index > 0 && (
          <IonButton fill="clear" className="photo-viewer__nav photo-viewer__nav--prev" onClick={() => scrollTo(index - 1)}>
            <IonIcon slot="icon-only" icon={chevronBack} aria-hidden="true" />
            <span className="visually-hidden">Previous photo</span>
          </IonButton>
        )}
        {index < photos.length - 1 && (
          <IonButton fill="clear" className="photo-viewer__nav photo-viewer__nav--next" onClick={() => scrollTo(index + 1)}>
            <IonIcon slot="icon-only" icon={chevronForward} aria-hidden="true" />
            <span className="visually-hidden">Next photo</span>
          </IonButton>
        )}
        {caption && <p className="photo-viewer__caption">{caption}</p>}
      </IonContent>
    </IonModal>
  );
}

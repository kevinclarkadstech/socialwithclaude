import { IonButton, IonIcon } from '@ionic/react';
import { chevronBack, chevronForward } from 'ionicons/icons';
import { useRef, useState } from 'react';
import { Photo } from '../../../../common/components/Photo/Photo';
import { openPhotoViewer } from '../../../../common/components/PhotoViewer/photoViewerStore';
import type { DisplayPhoto } from '../../../../lib/images/displayPhoto';
import { feedAspectRatio } from '../../utils/postPhotoUrl';
import './PostPhotoCarousel.css';

interface PostPhotoCarouselProps {
  /** Published, or still on this device while the listing is being sent. */
  photos: DisplayPhoto[];
}

/**
 * A listing's photos one at a time, whole (not cropped), in the first
 * photo's shape: swipe or use the arrows; dots say where you are. Tapping
 * one opens them all full screen.
 */
export function PostPhotoCarousel({ photos }: PostPhotoCarouselProps) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  if (photos.length === 0) {
    return null;
  }

  function scrollTo(target: number) {
    const element = track.current;
    if (element) {
      element.scrollTo({ left: target * element.clientWidth, behavior: 'smooth' });
    }
  }

  return (
    <div className="post-photo-carousel" style={{ aspectRatio: String(feedAspectRatio(photos[0]!)) }}>
      <div
        ref={track}
        className="post-photo-carousel__track"
        onScroll={(event) => {
          const element = event.currentTarget;
          setIndex(Math.round(element.scrollLeft / Math.max(1, element.clientWidth)));
        }}
      >
        {photos.map((photo, itemIndex) => (
          <button
            key={photo.key}
            type="button"
            className="post-photo-carousel__slide"
            aria-label={`Photo ${itemIndex + 1} of ${photos.length}${photo.caption ? `: ${photo.caption}` : ''}`}
            onClick={(event) => {
              // The card opens the listing when tapped; a photo opens the viewer instead.
              event.stopPropagation();
              openPhotoViewer({ photos, index: itemIndex });
            }}
          >
            <Photo photo={photo} fit="contain" sizes="(min-width: 700px) 640px, 100vw" />
          </button>
        ))}
      </div>
      {photos.length > 1 && (
        <>
          <span className="post-photo-carousel__count" aria-hidden="true">{index + 1}/{photos.length}</span>
          {index > 0 && (
            <IonButton
              fill="clear"
              className="post-photo-carousel__nav post-photo-carousel__nav--prev"
              onClick={(event) => {
                event.stopPropagation();
                scrollTo(index - 1);
              }}
            >
              <IonIcon slot="icon-only" icon={chevronBack} aria-hidden="true" />
              <span className="visually-hidden">Previous photo</span>
            </IonButton>
          )}
          {index < photos.length - 1 && (
            <IonButton
              fill="clear"
              className="post-photo-carousel__nav post-photo-carousel__nav--next"
              onClick={(event) => {
                event.stopPropagation();
                scrollTo(index + 1);
              }}
            >
              <IonIcon slot="icon-only" icon={chevronForward} aria-hidden="true" />
              <span className="visually-hidden">Next photo</span>
            </IonButton>
          )}
          <div className="post-photo-carousel__dots" aria-hidden="true">
            {photos.map((photo, itemIndex) => (
              <span key={photo.key} data-active={String(itemIndex === index)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

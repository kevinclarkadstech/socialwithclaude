import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonModal,
  IonRange,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { removeOutline, addOutline } from 'ionicons/icons';
import { useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import type { CropArea } from '../../../lib/photos/renderCroppedPhotos';
import './PhotoCropModal.css';

interface PhotoCropModalProps {
  isOpen: boolean;
  /** An object URL of the photo to crop. */
  photoUrl: string | null;
  title: string;
  /** Width ÷ height of the crop, e.g. 1 for an avatar. */
  aspectRatio: number;
  /** "round" shows a circle guide (avatars); the crop itself is still the square around it. */
  shape?: 'rect' | 'round';
  onCancel: () => void;
  /** Resolves true once it's done, which closes the modal; false keeps it open. */
  onConfirm: (crop: CropArea) => Promise<boolean>;
}

/** Choosing the part of a photo to use: drag to move, pinch or use the slider to zoom. */
export function PhotoCropModal({ isOpen, photoUrl, title, aspectRatio, shape = 'rect', onCancel, onConfirm }: PhotoCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  // The cropper measures its stage once it mounts, so it waits until the modal has finished opening.
  const [isPresented, setIsPresented] = useState(false);

  function reset() {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setArea(null);
    setIsSaving(false);
    setIsPresented(false);
  }

  async function confirm() {
    if (!area) {
      return;
    }
    setIsSaving(true);
    try {
      const done = await onConfirm(area);
      if (!done) {
        setIsSaving(false);
      }
    } catch {
      setIsSaving(false);
    }
  }

  return (
    <IonModal
      isOpen={isOpen}
      onWillPresent={reset}
      onDidPresent={() => setIsPresented(true)}
      onDidDismiss={() => {
        setIsPresented(false);
        onCancel();
      }}
      className="photo-crop-modal"
    >
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onCancel} disabled={isSaving}>
              Cancel
            </IonButton>
          </IonButtons>
          <IonTitle>{title}</IonTitle>
          <IonButtons slot="end">
            <IonButton strong disabled={!area || isSaving} onClick={() => void confirm()}>
              {isSaving ? <IonSpinner name="dots" /> : 'Save'}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent scrollY={false} className="photo-crop-modal__content">
        {photoUrl && isPresented && (
          <Cropper
            image={photoUrl}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            cropShape={shape}
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_percent, pixels) => setArea(pixels)}
          />
        )}
      </IonContent>
      <IonFooter>
        <IonToolbar>
          <IonRange
            aria-label="Zoom"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onIonInput={(event) => setZoom(Number(event.detail.value))}
          >
            <IonIcon slot="start" icon={removeOutline} aria-hidden="true" />
            <IonIcon slot="end" icon={addOutline} aria-hidden="true" />
          </IonRange>
        </IonToolbar>
      </IonFooter>
    </IonModal>
  );
}

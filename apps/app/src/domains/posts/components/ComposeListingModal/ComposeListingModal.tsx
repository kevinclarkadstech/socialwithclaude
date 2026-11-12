import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonLabel,
  IonModal,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/react';
import { listingConditions, listingPriceTypes, listingStatuses, type PostView } from '@myapp/shared/domains';
import type { FormEvent } from 'react';
import { listingConditionLabels, listingStatusLabels, listingTypeLabels } from '../../../../utils/formatters/listings';
import { useComposeListing } from '../../hooks/useComposeListing';
import { PostPhotosField } from '../PostPhotosField/PostPhotosField';
import '../../../../common/styles/modal-form.css';
import './ComposeListingModal.css';

interface ComposeListingModalProps {
  isOpen: boolean;
  /** The listing being edited; without one, a new listing. */
  post?: PostView;
  onDismiss: () => void;
}

/** Listing something for sale, or editing one of your listings (including marking it sold). */
export function ComposeListingModal({ isOpen, post, onDismiss }: ComposeListingModalProps) {
  const { fields, set, errors, photos, isBusy, canSubmit, reset, submit } = useComposeListing({ post, onDismiss });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void submit();
  }

  return (
    <IonModal isOpen={isOpen} onWillPresent={reset} onDidDismiss={onDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onDismiss}>Cancel</IonButton>
          </IonButtons>
          <IonTitle>{post ? 'Edit listing' : 'New listing'}</IonTitle>
          <IonButtons slot="end">
            <IonButton strong disabled={!canSubmit} onClick={() => void submit()}>
              {isBusy ? <IonSpinner name="dots" aria-label="Saving" /> : post ? 'Save' : 'List'}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <form className="modal-form" onSubmit={onSubmit}>
          <div className="compose-listing__group">
            <IonLabel className="compose-listing__label">Photos</IonLabel>
            <PostPhotosField photos={photos} />
          </div>

          <IonInput
            label="Title"
            labelPlacement="stacked"
            fill="outline"
            placeholder="What are you selling?"
            maxlength={200}
            className={errors.title ? 'ion-invalid ion-touched' : undefined}
            errorText={errors.title}
            value={fields.title}
            onIonInput={(event) => set.setTitle(event.detail.value ?? '')}
          />

          <div className="compose-listing__group">
            <IonLabel className="compose-listing__label">Price</IonLabel>
            <IonSegment
              value={fields.priceType}
              onIonChange={(event) => set.setPriceType(event.detail.value as typeof fields.priceType)}
            >
              {listingPriceTypes.map((type) => (
                <IonSegmentButton key={type} value={type}>
                  <IonLabel>{listingTypeLabels[type]}</IonLabel>
                </IonSegmentButton>
              ))}
            </IonSegment>
            {fields.priceType === 'fixed' && (
              <>
                <IonInput
                  aria-label="Price in dollars"
                  fill="outline"
                  inputmode="decimal"
                  placeholder="0.00"
                  className={errors.price ? 'ion-invalid ion-touched' : undefined}
                  errorText={errors.price}
                  value={fields.price}
                  onIonInput={(event) => set.setPrice(event.detail.value ?? '')}
                >
                  <span slot="start" aria-hidden="true">$</span>
                </IonInput>
                <IonToggle
                  justify="space-between"
                  checked={fields.isNegotiable}
                  onIonChange={(event) => set.setIsNegotiable(event.detail.checked)}
                >
                  Open to offers
                </IonToggle>
              </>
            )}
          </div>

          <div className="compose-listing__group">
            <IonLabel className="compose-listing__label">Condition</IonLabel>
            <IonSegment
              value={fields.condition}
              onIonChange={(event) => set.setCondition(event.detail.value as typeof fields.condition)}
            >
              {listingConditions.map((condition) => (
                <IonSegmentButton key={condition} value={condition}>
                  <IonLabel>{listingConditionLabels[condition]}</IonLabel>
                </IonSegmentButton>
              ))}
            </IonSegment>
          </div>

          <IonTextarea
            label="Description"
            labelPlacement="stacked"
            fill="outline"
            placeholder="Size, age, where to pick it up…"
            autoGrow
            counter
            maxlength={2000}
            rows={4}
            className={errors.description ? 'ion-invalid ion-touched' : undefined}
            errorText={errors.description}
            value={fields.description}
            onIonInput={(event) => set.setDescription(event.detail.value ?? '')}
          />

          {post && (
            <div className="compose-listing__group">
              <IonLabel className="compose-listing__label">Status</IonLabel>
              <IonSegment value={fields.status} onIonChange={(event) => set.setStatus(event.detail.value as typeof fields.status)}>
                {listingStatuses.map((status) => (
                  <IonSegmentButton key={status} value={status}>
                    <IonLabel>{listingStatusLabels[status]}</IonLabel>
                  </IonSegmentButton>
                ))}
              </IonSegment>
            </div>
          )}
        </form>
      </IonContent>
    </IonModal>
  );
}

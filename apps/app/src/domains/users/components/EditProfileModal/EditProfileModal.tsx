import { IonButton, IonButtons, IonContent, IonHeader, IonInput, IonModal, IonTextarea, IonTitle, IonToolbar } from '@ionic/react';
import type { UserProfile } from '@myapp/shared/domains';
import type { FormEvent } from 'react';
import { useEditProfile } from '../../hooks/useEditProfile/useEditProfile';
import '../../../../common/styles/modal-form.css';

interface EditProfileModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  /** After saving, with the saved profile (its username may have changed). */
  onSaved: (profile: UserProfile) => void;
}

/** Editing your username, name and about. */
export function EditProfileModal({ isOpen, onDismiss, onSaved }: EditProfileModalProps) {
  const { fields, set, errors, isBusy, reset, submit } = useEditProfile({
    onSaved: (profile) => {
      onSaved(profile);
      onDismiss();
    },
  });

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
          <IonTitle>Edit profile</IonTitle>
          <IonButtons slot="end">
            <IonButton strong disabled={isBusy} onClick={() => void submit()}>
              Save
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <form className="modal-form" onSubmit={onSubmit}>
          <IonInput
            label="Username"
            labelPlacement="stacked"
            fill="outline"
            autocapitalize="off"
            autocomplete="username"
            helperText="3–30 lowercase letters, numbers and underscores"
            maxlength={30}
            className={errors.username ? 'ion-invalid ion-touched' : undefined}
            errorText={errors.username}
            value={fields.username}
            onIonInput={(event) => set.setUsername(event.detail.value ?? '')}
          />
          <IonInput
            label="First name"
            labelPlacement="stacked"
            fill="outline"
            autocomplete="given-name"
            maxlength={50}
            className={errors.firstName ? 'ion-invalid ion-touched' : undefined}
            errorText={errors.firstName}
            value={fields.firstName}
            onIonInput={(event) => set.setFirstName(event.detail.value ?? '')}
          />
          <IonInput
            label="Last name"
            labelPlacement="stacked"
            fill="outline"
            autocomplete="family-name"
            maxlength={50}
            className={errors.lastName ? 'ion-invalid ion-touched' : undefined}
            errorText={errors.lastName}
            value={fields.lastName}
            onIonInput={(event) => set.setLastName(event.detail.value ?? '')}
          />
          <IonTextarea
            label="About"
            labelPlacement="stacked"
            fill="outline"
            placeholder="A line or two about you"
            autoGrow
            counter
            maxlength={500}
            rows={3}
            className={errors.about ? 'ion-invalid ion-touched' : undefined}
            errorText={errors.about}
            value={fields.about}
            onIonInput={(event) => set.setAbout(event.detail.value ?? '')}
          />
          {/* Enter in a field submits. */}
          <button type="submit" hidden />
        </form>
      </IonContent>
    </IonModal>
  );
}

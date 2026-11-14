import { IonButton } from '@ionic/react';
import { requireCallerWithProfile } from '@myapp/shared/authorization';
import { useCallingUser } from '../../hooks/useCallingUser/useCallingUser';
import { disallowedActions } from '../../../../common/events/disallowedActions/disallowedActions';
import { UserAvatar } from '../UserAvatar/UserAvatar';

/** The header's account button: your avatar (opens /me), or "Sign in". */
export function AccountButton() {
  const { isLoaded, callingUser } = useCallingUser();
  const signedUpCheck = requireCallerWithProfile({ caller: callingUser });

  if (!isLoaded) {
    return null;
  }
  if (signedUpCheck.ok) {
    return (
      <IonButton routerLink="/me" aria-label="Your profile">
        <UserAvatar user={signedUpCheck.value.profile} size={32} />
      </IonButton>
    );
  }
  return (
    <IonButton onClick={() => disallowedActions.emit({ error: signedUpCheck.error })}>
      {callingUser ? 'Finish sign-up' : 'Sign in'}
    </IonButton>
  );
}

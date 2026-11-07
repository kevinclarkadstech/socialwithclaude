import { IonButton } from '@ionic/react';
import { useCallingUser } from '../../hooks/useCallingUser';
import { useRequireSignIn } from '../../../../common/hooks/useRequireSignIn';
import { UserAvatar } from '../UserAvatar/UserAvatar';

/** The header's account button: your avatar (opens /me), or "Sign in". */
export function AccountButton() {
  const { isLoaded, callingUser } = useCallingUser();
  const requireSignIn = useRequireSignIn();

  if (!isLoaded) {
    return null;
  }
  if (callingUser?.profile) {
    return (
      <IonButton routerLink="/me" aria-label="Your profile">
        <UserAvatar user={callingUser.profile} size={32} />
      </IonButton>
    );
  }
  return <IonButton onClick={() => requireSignIn()}>{callingUser ? 'Finish sign-up' : 'Sign in'}</IonButton>;
}

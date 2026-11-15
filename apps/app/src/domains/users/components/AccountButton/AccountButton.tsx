import { IonButton } from '@ionic/react';
import { requireCallerWithProfile } from '@myapp/shared/authorization';
import { useCallingUser } from '../../hooks/useCallingUser/useCallingUser';
import { disallowedActions } from '../../../../common/events/disallowedActions/disallowedActions';
import { UserAvatar } from '../UserAvatar/UserAvatar';

/** The header's account button: your avatar (opens your profile, /profile/:username), or "Sign in". */
export function AccountButton() {
  const { isLoaded, callingUser } = useCallingUser();
  const signedUpCheck = requireCallerWithProfile({ caller: callingUser });

  if (!isLoaded) {
    return null;
  }
  if (!signedUpCheck.ok) {
    return (
      <IonButton onClick={() => disallowedActions.emit({ error: signedUpCheck.error })}>
        {callingUser ? 'Finish sign-up' : 'Sign in'}
      </IonButton>
    );
  }
  // Anyone who finished sign-up has one.
  const profile = callingUser?.profile;
  if (!profile) {
    return null;
  }
  return (
    <IonButton routerLink={`/profile/${profile.username}`} aria-label="Your profile">
      <UserAvatar user={profile} size={32} />
    </IonButton>
  );
}

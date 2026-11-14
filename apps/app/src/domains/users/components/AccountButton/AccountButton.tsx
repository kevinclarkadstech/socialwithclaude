import { IonButton } from '@ionic/react';
import { requireCallerWithProfile } from '@myapp/shared/authorization';
import { useCallingUser } from '../../hooks/useCallingUser/useCallingUser';
import { disallowedActions } from '../../../../common/events/disallowedActions/disallowedActions';
import { UserAvatar } from '../UserAvatar/UserAvatar';
import { useTabHref } from '../../../../navigation';

/** The header's account button: your avatar (opens your profile in this tab), or "Sign in". */
export function AccountButton() {
  const { isLoaded, callingUser } = useCallingUser();
  const signedUpCheck = requireCallerWithProfile({ caller: callingUser });
  const tabHref = useTabHref();

  if (!isLoaded) {
    return null;
  }
  if (signedUpCheck.ok) {
    return (
      <IonButton routerLink={tabHref(`profile/${signedUpCheck.value.profile.username}`)} aria-label="Your profile">
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

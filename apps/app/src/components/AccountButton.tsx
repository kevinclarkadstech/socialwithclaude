import { IonButton } from '@ionic/react';
import { useRequireSignIn } from '../auth/SignInContext';
import { useCallingUser } from '../hooks/useCallingUser';
import { useTabHref } from '../navigation';
import { UserAvatar } from './UserAvatar';

/** The header's account button: your avatar (opens your profile), or "Sign in". */
export function AccountButton() {
  const { callingUser, isPending } = useCallingUser();
  const requireSignIn = useRequireSignIn();
  const tabHref = useTabHref();

  if (isPending) {
    return null;
  }
  if (callingUser?.profile) {
    return (
      <IonButton routerLink={tabHref('me')} aria-label="Your profile">
        <UserAvatar user={callingUser.profile} size={32} />
      </IonButton>
    );
  }
  return <IonButton onClick={() => requireSignIn()}>{callingUser ? 'Finish sign-up' : 'Sign in'}</IonButton>;
}

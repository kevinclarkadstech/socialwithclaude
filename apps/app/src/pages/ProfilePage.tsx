import { IonButton, IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { useState } from 'react';
import { useRequireSignIn } from '../auth/SignInContext';
import { UserAvatar } from '../components/UserAvatar';
import { useCallingUser } from '../hooks/useCallingUser';
import { signOut } from '../hooks/useSignIn';
import { BackButton } from '../navigation';
import { displayName } from '../utils/names';
import './pages.css';
import './ProfilePage.css';

/** Your own profile, opened from the header avatar. Settings and the rest will live here. */
export default function ProfilePage() {
  const { callingUser } = useCallingUser();
  const requireSignIn = useRequireSignIn();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const profile = callingUser?.profile;

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <BackButton />
          </IonButtons>
          <IonTitle>Profile</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {profile ? (
          <div className="profile">
            <UserAvatar user={profile} size={72} />
            <h2 className="profile__name">{displayName(profile)}</h2>
            <p className="profile__meta">@{profile.username}</p>
            <p className="profile__meta">{callingUser.email}</p>
            <IonButton fill="outline" color="medium" disabled={isSigningOut} onClick={() => void handleSignOut()}>
              Sign out
            </IonButton>
          </div>
        ) : (
          <div className="page-message">
            <IonButton onClick={() => requireSignIn()}>Sign in</IonButton>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
}

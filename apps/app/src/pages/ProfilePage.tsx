import { IonButton, IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { UserAvatar } from '../domains/users/components/UserAvatar';
import { displayName } from '../common/formatters/names';
import { useRequireSignIn } from '../common/hooks/useRequireSignIn';
import { useCallingUser } from '../domains/users/hooks/useCallingUser';
import { BackButton } from '../navigation';
import { useAuth } from '../domains/auth/hooks/useAuth';
import './pages.css';
import './ProfilePage.css';

/** Your own profile at /me, opened from the header avatar. Settings and the rest will live here. */
export default function ProfilePage() {
  const { callingUser } = useCallingUser();
  const requireSignIn = useRequireSignIn();
  const { signOut } = useAuth();
  const profile = callingUser?.profile;

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
            <IonButton fill="outline" color="medium" onClick={() => void signOut()}>
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

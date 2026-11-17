import { IonButton, IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { canReadMyNotifications } from '@myapp/shared/domains';
import { disallowedActions } from '../../common/events/disallowedActions/disallowedActions';
import { NotificationList } from '../../domains/notifications';
import { useCallingUser } from '../../domains/users';
import { BackButton } from '../../navigation';
import '../../common/styles/pages.css';

/** /notifications, from the bell: updates on your reports and messages from the team. */
export function NotificationsPage() {
  const { callingUser } = useCallingUser();
  const readCheck = canReadMyNotifications({ caller: callingUser });

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <BackButton />
          </IonButtons>
          <IonTitle>Notifications</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {readCheck.ok ? (
          <NotificationList />
        ) : (
          <div className="page-message">
            <p>{callingUser ? 'Finish signing up to see your notifications.' : 'Sign in to see your notifications.'}</p>
            <IonButton onClick={() => disallowedActions.emit({ error: readCheck.error })}>{callingUser ? 'Finish sign-up' : 'Sign in'}</IonButton>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
}

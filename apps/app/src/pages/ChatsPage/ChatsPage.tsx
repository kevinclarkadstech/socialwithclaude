import { IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { AccountButton } from '../../domains/users/components/AccountButton/AccountButton';
import '../../common/styles/pages.css';

/** The Chats tab. Not built yet. */
export function ChatsPage() {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Chats</IonTitle>
          <IonButtons slot="end">
            <AccountButton />
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <p className="page-message">Your conversations will show up here.</p>
      </IonContent>
    </IonPage>
  );
}

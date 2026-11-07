import { IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { AccountButton } from '../../domains/users/components/AccountButton/AccountButton';
import '../../common/styles/pages.css';

/** The Marketplace tab. Not built yet. */
export function MarketplacePage() {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Marketplace</IonTitle>
          <IonButtons slot="end">
            <AccountButton />
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <p className="page-message">Listings will show up here.</p>
      </IonContent>
    </IonPage>
  );
}

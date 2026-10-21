import { IonButton, IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { useState } from 'react';
import { useParams } from 'react-router';
import { BackButton, usePageContext, useTabHref } from '../navigation';

const ItemDetail: React.FC = () => {
  const { itemId } = useParams();
  const { tabId } = usePageContext();
  const tabHref = useTabHref();
  // Local state survives switching tabs and pushing pages on top of this one.
  const [count, setCount] = useState(0);
  const nextId = Number(itemId) + 1;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <BackButton />
          </IonButtons>
          <IonTitle>Item {itemId}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <p>
          Item {itemId} in {tabId}
        </p>
        <IonButton onClick={() => setCount((c) => c + 1)}>Tapped {count} times</IonButton>
        <IonButton fill="outline" routerLink={tabHref(`items/${nextId}`)}>
          Push item {nextId}
        </IonButton>
      </IonContent>
    </IonPage>
  );
};

export default ItemDetail;

import { IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { useNavigate } from 'react-router';
import { LegalDocument, legalDocumentTitle, type LegalDocumentName } from '../../domains/legal';
import { BackButton } from '../../navigation';

/** /terms and /privacy: a legal document, for anyone, signed in or not. */
export function LegalPage({ name }: { name: LegalDocumentName }) {
  const navigate = useNavigate();
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <BackButton />
          </IonButtons>
          <IonTitle>{legalDocumentTitle(name)}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <LegalDocument name={name} onOpenLink={(path) => navigate(path)} />
      </IonContent>
    </IonPage>
  );
}

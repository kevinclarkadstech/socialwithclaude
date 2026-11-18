import { useState } from 'react';
import { IonButton, IonButtons, IonContent, IonHeader, IonModal, IonTitle, IonToolbar } from '@ionic/react';
import type { LegalDocumentName } from '../../types';
import { legalDocumentTitle } from '../../utils/legalDocumentHtml/legalDocumentHtml';
import { LegalDocument } from '../LegalDocument/LegalDocument';

const documentPaths: Record<string, LegalDocumentName> = { '/terms': 'terms', '/privacy': 'privacy' };

/**
 * A legal document over whatever's open (sign-up, the updated-terms
 * screen), so reading it doesn't lose your place. A link to the other
 * document switches to it.
 */
export function LegalDocumentModal({ name, onClose }: { name: LegalDocumentName | null; onClose: () => void }) {
  const [shown, setShown] = useState<LegalDocumentName | null>(name);
  // Follows `name` when it's opened again from outside.
  const [opened, setOpened] = useState(name);
  if (name !== opened) {
    setOpened(name);
    setShown(name);
  }

  return (
    <IonModal isOpen={name !== null} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{shown ? legalDocumentTitle(shown) : ''}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>Done</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {shown && <LegalDocument name={shown} onOpenLink={(path) => setShown(documentPaths[path] ?? shown)} />}
      </IonContent>
    </IonModal>
  );
}

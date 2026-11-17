import { IonButtons, IonContent, IonHeader, IonLabel, IonPage, IonSegment, IonSegmentButton, IonTitle, IonToolbar } from '@ionic/react';
import { canModerate } from '@myapp/shared/domains';
import { useState } from 'react';
import { FeedbackList, ReportQueue } from '../../domains/moderation';
import { useCallingUser } from '../../domains/users';
import { BackButton } from '../../navigation';
import '../../common/styles/pages.css';

type Section = 'reports' | 'feedback';

/**
 * /moderation, from Settings (admins only): the report queue and feedback.
 * Loaded on demand (see routes), so it costs everyone else nothing.
 */
export function ModerationPage() {
  const { callingUser } = useCallingUser();
  const [section, setSection] = useState<Section>('reports');
  const allowed = canModerate({ caller: callingUser }).ok;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <BackButton />
          </IonButtons>
          <IonTitle>Moderation</IonTitle>
        </IonToolbar>
        {allowed && (
          <IonToolbar>
            <IonSegment value={section} onIonChange={(event) => setSection(event.detail.value as Section)}>
              <IonSegmentButton value="reports">
                <IonLabel>Reports</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="feedback">
                <IonLabel>Feedback</IonLabel>
              </IonSegmentButton>
            </IonSegment>
          </IonToolbar>
        )}
      </IonHeader>
      <IonContent color="light">
        {!allowed && <p className="page-message">This page is for moderators.</p>}
        {allowed && section === 'reports' && <ReportQueue />}
        {allowed && section === 'feedback' && <FeedbackList />}
      </IonContent>
    </IonPage>
  );
}

import { IonButton, IonLabel, IonSegment, IonSegmentButton, IonSpinner } from '@ionic/react';
import type { ReportedItem } from '@myapp/shared/domains';
import { useEffect, useState } from 'react';
import { runGetReportQueueQuery } from '../../operations/runGetReportQueueQuery/runGetReportQueueQuery';
import { ReportedItemCard } from '../ReportedItemCard/ReportedItemCard';

type Status = 'open' | 'resolved';

/** The moderation queue: what's waiting (longest first), or what was settled lately. */
export function ReportQueue() {
  const [status, setStatus] = useState<Status>('open');
  const [loaded, setLoaded] = useState<{ status: Status; version: number; items: ReportedItem[] | 'failed' } | null>(null);
  // Bumped to load again (after an action, or Try again).
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void runGetReportQueueQuery({ status })
      .catch(() => null)
      .then((result) => {
        if (!cancelled) {
          setLoaded({ status, version, items: result?.ok ? result.value : 'failed' });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [status, version]);

  const reload = () => setVersion((current) => current + 1);
  // What was loaded for this tab (kept on screen while it reloads after an action).
  const shown = loaded?.status === status ? loaded.items : null;

  const items = shown === 'failed' ? null : shown;

  return (
    <div className="report-queue">
      <IonSegment value={status} onIonChange={(event) => setStatus(event.detail.value as Status)}>
        <IonSegmentButton value="open">
          <IonLabel>Open</IonLabel>
        </IonSegmentButton>
        <IonSegmentButton value="resolved">
          <IonLabel>Resolved</IonLabel>
        </IonSegmentButton>
      </IonSegment>
      {shown === 'failed' && (
        <div className="page-message">
          <p>Couldn't load the reports.</p>
          <IonButton fill="outline" onClick={reload}>
            Try again
          </IonButton>
        </div>
      )}
      {shown === null && (
        <div className="page-message">
          <IonSpinner />
        </div>
      )}
      {items?.length === 0 && <p className="page-message">{status === 'open' ? 'Nothing waiting. 🎉' : 'Nothing settled yet.'}</p>}
      {items?.map((item) => (
        <ReportedItemCard key={`${item.kind}:${item.targetId}`} item={item} onChanged={reload} />
      ))}
    </div>
  );
}

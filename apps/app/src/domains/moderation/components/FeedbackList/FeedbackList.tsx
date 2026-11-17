import { IonButton, IonItem, IonLabel, IonList, IonNote, IonSegment, IonSegmentButton, IonSpinner } from '@ionic/react';
import type { FeedbackItem, UserFeedbackStatus } from '@myapp/shared/domains';
import { useState } from 'react';
import { runOrToast } from '../../../../lib/api/runOrToast';
import { usePagedQuery } from '../../../../lib/api/usePagedQuery';
import { timeAgo } from '../../../../utils/formatters/dates';
import { runGetFeedbackQuery } from '../../operations/runGetFeedbackQuery/runGetFeedbackQuery';
import { runUpdateFeedbackStatusMutation } from '../../operations/runUpdateFeedbackStatusMutation/runUpdateFeedbackStatusMutation';

type Filter = UserFeedbackStatus | 'all';

// Module-level, one per filter: usePagedQuery wants a stable fetcher.
const fetchers: Record<Filter, (args: { cursor: string | null }) => ReturnType<typeof runGetFeedbackQuery>> = {
  new: ({ cursor }) => runGetFeedbackQuery({ cursor, status: 'new' }),
  read: ({ cursor }) => runGetFeedbackQuery({ cursor, status: 'read' }),
  done: ({ cursor }) => runGetFeedbackQuery({ cursor, status: 'done' }),
  all: ({ cursor }) => runGetFeedbackQuery({ cursor, status: null }),
};

const categoryLabels = { bug: 'Bug', idea: 'Idea', other: 'Other' } as const;

function Feedback({ filter }: { filter: Filter }) {
  const feedback = usePagedQuery(fetchers[filter]);
  const [updating, setUpdating] = useState<string | null>(null);

  async function mark(item: FeedbackItem, status: UserFeedbackStatus) {
    setUpdating(item.id);
    const result = await runOrToast(() => runUpdateFeedbackStatusMutation({ id: item.id, status }));
    setUpdating(null);
    if (result.ok && filter !== 'all') {
      feedback.remove((other) => other.id === item.id);
    }
    if (result.ok && filter === 'all') {
      await feedback.reload();
    }
  }

  return (
    <IonList inset>
      {feedback.status === 'loading' && (
        <IonItem lines="none">
          <IonSpinner />
        </IonItem>
      )}
      {feedback.status === 'failed' && (
        <IonItem lines="none">
          <IonNote>Couldn't load feedback.</IonNote>
        </IonItem>
      )}
      {feedback.status === 'ready' && feedback.items.length === 0 && (
        <IonItem lines="none">
          <IonNote>Nothing here.</IonNote>
        </IonItem>
      )}
      {feedback.items.map((item) => (
        <IonItem key={item.id} data-feedback-id={item.id}>
          <IonLabel className="ion-text-wrap">
            <p>
              <strong>{categoryLabels[item.category]}</strong> · {item.user ? `@${item.user.username}` : 'someone'} · {timeAgo(item.createdAt)}
              {filter === 'all' && ` · ${item.status}`}
            </p>
            <h3 style={{ whiteSpace: 'pre-wrap' }}>{item.message}</h3>
            {item.pageUrl && <p>From {item.pageUrl}</p>}
            {item.userAgent && <p>{item.userAgent}</p>}
          </IonLabel>
          <div slot="end">
            {item.status === 'new' && (
              <IonButton size="small" fill="outline" disabled={updating === item.id} onClick={() => void mark(item, 'read')}>
                Read
              </IonButton>
            )}
            {item.status !== 'done' && (
              <IonButton size="small" disabled={updating === item.id} onClick={() => void mark(item, 'done')}>
                Done
              </IonButton>
            )}
          </div>
        </IonItem>
      ))}
      {feedback.hasMore && (
        <IonItem lines="none">
          <IonButton fill="clear" disabled={feedback.isLoadingMore} onClick={() => void feedback.loadMore()}>
            Load more
          </IonButton>
        </IonItem>
      )}
    </IonList>
  );
}

/** Feedback people sent from the app, newest first, filtered by status, with Read and Done. */
export function FeedbackList() {
  const [filter, setFilter] = useState<Filter>('new');
  return (
    <div className="feedback-list">
      <IonSegment value={filter} onIonChange={(event) => setFilter(event.detail.value as Filter)}>
        <IonSegmentButton value="new">
          <IonLabel>New</IonLabel>
        </IonSegmentButton>
        <IonSegmentButton value="read">
          <IonLabel>Read</IonLabel>
        </IonSegmentButton>
        <IonSegmentButton value="done">
          <IonLabel>Done</IonLabel>
        </IonSegmentButton>
        <IonSegmentButton value="all">
          <IonLabel>All</IonLabel>
        </IonSegmentButton>
      </IonSegment>
      <Feedback key={filter} filter={filter} />
    </div>
  );
}

import { IonBadge, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle } from '@ionic/react';
import type { ReportedItem } from '@myapp/shared/domains';
import { useState } from 'react';
import { timeAgo } from '../../../../utils/formatters/dates';
import { reportReasonLabels } from '../../../../utils/formatters/reportReasons';
import { banUser } from '../../actions/banUser/banUser';
import { resolveReports } from '../../actions/resolveReports/resolveReports';
import { unbanUser } from '../../actions/unbanUser/unbanUser';
import { describeReportedItem } from '../../utils/describeReportedItem/describeReportedItem';
import './ReportedItemCard.css';

/** What was reported, as it was when last reported. */
function Snapshot({ item }: { item: ReportedItem }) {
  if (item.kind === 'post') {
    const photos = item.snapshot.media.length;
    return (
      <>
        <p className="reported-item__content">{item.snapshot.content || <em>No text</em>}</p>
        {photos > 0 && <p className="reported-item__meta">{photos === 1 ? '1 photo' : `${photos} photos`}</p>}
      </>
    );
  }
  if (item.kind === 'postComment') {
    return <p className="reported-item__content">{item.snapshot.content}</p>;
  }
  if (item.kind === 'profile') {
    const name = [item.snapshot.firstName, item.snapshot.lastName].filter(Boolean).join(' ');
    return (
      <>
        <p className="reported-item__content">
          <strong>@{item.snapshot.username}</strong>
          {name && ` · ${name}`}
        </p>
        {item.snapshot.about && <p className="reported-item__content">{item.snapshot.about}</p>}
      </>
    );
  }
  // A chat message: the few before it (for context), then the reported one.
  return (
    <ol className="reported-item__chat">
      {item.snapshot.earlier.map((message) => (
        <li key={message.id} className="reported-item__chat-earlier">
          <strong>@{message.creator.username}</strong> {message.content}
        </li>
      ))}
      <li className="reported-item__chat-reported">
        <strong>@{item.snapshot.message.creator.username}</strong> {item.snapshot.message.content}
      </li>
    </ol>
  );
}

/**
 * One reported thing in the moderation queue: it, who it's by, every report
 * about it, and (while open) what to do: dismiss, remove, or ban its person.
 * `onChanged` runs after an action went through, to reload the queue.
 */
export function ReportedItemCard({ item, onChanged }: { item: ReportedItem; onChanged: () => void }) {
  const [isBusy, setIsBusy] = useState(false);
  const { noun } = describeReportedItem(item);
  const who = item.subject.username ? `@${item.subject.username}` : 'someone without a profile';
  const canBan = item.subject.role !== 'admin';

  async function act(action: () => Promise<boolean>) {
    setIsBusy(true);
    const changed = await action();
    setIsBusy(false);
    if (changed) {
      onChanged();
    }
  }

  return (
    <IonCard className="reported-item" data-kind={item.kind} data-target-id={item.targetId}>
      <IonCardHeader>
        <IonCardSubtitle>
          {item.kind === 'profile' ? 'Profile' : `${noun[0]!.toUpperCase()}${noun.slice(1)} by ${who}`}
          {item.subject.isBanned && (
            <IonBadge color="danger" className="reported-item__badge">
              Banned{item.subject.banExpires ? ` until ${new Date(item.subject.banExpires).toLocaleDateString()}` : ''}
            </IonBadge>
          )}
        </IonCardSubtitle>
        <IonCardTitle className="reported-item__title">
          {item.reports.length === 1 ? '1 report' : `${item.reports.length} reports`}
          <span className="reported-item__when"> · last {timeAgo(item.lastReportedAt)}</span>
        </IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        <div className="reported-item__snapshot">
          <Snapshot item={item} />
        </div>
        <ul className="reported-item__reports">
          {item.reports.map((report) => (
            <li key={report.id}>
              <strong>{reportReasonLabels[report.reason]}</strong>
              {report.details && ` · “${report.details}”`}
              <span className="reported-item__meta">
                {' '}
                · {report.reporter ? `@${report.reporter.username}` : 'someone'} · {timeAgo(report.createdAt)}
                {!item.isOpen && ` · ${report.status}`}
              </span>
            </li>
          ))}
        </ul>
        <div className="reported-item__actions">
          {item.isOpen && (
            <IonButton size="small" fill="outline" disabled={isBusy} onClick={() => void act(() => resolveReports({ item, outcome: 'dismissed' }))}>
              Dismiss
            </IonButton>
          )}
          {item.isOpen && item.kind !== 'profile' && (
            <IonButton size="small" color="danger" disabled={isBusy} onClick={() => void act(() => resolveReports({ item, outcome: 'removed' }))}>
              Remove {noun}
            </IonButton>
          )}
          {canBan && !item.subject.isBanned && (
            <IonButton
              size="small"
              color="danger"
              fill="outline"
              disabled={isBusy}
              onClick={() =>
                void act(async () => {
                  const banned = await banUser({ subject: item.subject });
                  // A ban deals with a reported profile; other things stay in the queue to remove or dismiss.
                  if (banned && item.isOpen && item.kind === 'profile') {
                    await resolveReports({ item, outcome: 'reviewed' });
                  }
                  return banned;
                })
              }
            >
              Ban {item.subject.username ? `@${item.subject.username}` : 'user'}
            </IonButton>
          )}
          {item.subject.isBanned && (
            <IonButton size="small" fill="outline" disabled={isBusy} onClick={() => void act(() => unbanUser({ subject: item.subject }))}>
              Unban
            </IonButton>
          )}
        </div>
      </IonCardContent>
    </IonCard>
  );
}

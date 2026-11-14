import { IonButton, IonItem, IonLabel, IonList, IonListHeader, IonNote, IonSpinner } from '@ionic/react';
import { canRevokeOtherSessions, canRevokeSession } from '@myapp/shared/domains';
import { disallowedActions } from '../../../../common/events/disallowedActions/disallowedActions';
import { useCallingUser } from '../../../users';
import { timeAgo } from '../../../../utils/formatters/dates';
import { revokeOtherSessions } from '../../actions/revokeOtherSessions/revokeOtherSessions';
import { revokeSession } from '../../actions/revokeSession/revokeSession';
import { useMySessions } from '../../hooks/useMySessions/useMySessions';
import { describeUserAgent } from '../../utils/describeUserAgent/describeUserAgent';

/** Where you're signed in: this device, and the others with a sign-out for each (or all at once). */
export function SessionList() {
  const { callingUser } = useCallingUser();
  const { sessions, isFailed, reload } = useMySessions();
  const revokeCheck = canRevokeSession({ caller: callingUser });
  const revokeOthersCheck = canRevokeOtherSessions({ caller: callingUser });
  const hasOthers = (sessions ?? []).some((session) => !session.current);

  async function signOutOf(id: string) {
    const action = async () => {
      const result = await revokeSession({ id });
      if (result.ok) {
        await reload();
      }
    };
    if (!revokeCheck.ok) {
      disallowedActions.emit({ error: revokeCheck.error, action: () => void action() });
      return;
    }
    await action();
  }

  async function signOutOfOthers() {
    const action = async () => {
      const result = await revokeOtherSessions();
      if (result?.ok) {
        await reload();
      }
    };
    if (!revokeOthersCheck.ok) {
      disallowedActions.emit({ error: revokeOthersCheck.error, action: () => void action() });
      return;
    }
    await action();
  }

  return (
    <IonList inset>
      <IonListHeader>Where you're signed in</IonListHeader>
      {!sessions && !isFailed && (
        <IonItem lines="none">
          <IonSpinner />
        </IonItem>
      )}
      {isFailed && (
        <IonItem lines="none">
          <IonNote>Couldn't load your devices.</IonNote>
        </IonItem>
      )}
      {sessions?.map((session) => (
        <IonItem key={session.id} data-session-current={String(session.current)}>
          <IonLabel>
            <h3>{describeUserAgent(session.userAgent)}</h3>
            <p>{session.current ? 'This device' : `Active ${timeAgo(session.updatedAt)}`}</p>
          </IonLabel>
          {!session.current && (
            <IonButton slot="end" fill="clear" color="danger" onClick={() => void signOutOf(session.id)}>
              Sign out
            </IonButton>
          )}
        </IonItem>
      ))}
      {hasOthers && (
        <IonItem button detail={false} lines="none" onClick={() => void signOutOfOthers()}>
          <IonLabel color="danger">Sign out of all other devices</IonLabel>
        </IonItem>
      )}
    </IonList>
  );
}

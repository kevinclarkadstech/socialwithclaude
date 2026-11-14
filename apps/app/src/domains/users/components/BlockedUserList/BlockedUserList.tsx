import { IonButton, IonItem, IonList, IonListHeader, IonNote, IonSpinner } from '@ionic/react';
import { canUnblockUser, type UserBlockView } from '@myapp/shared/domains';
import { useState } from 'react';
import { disallowedActions } from '../../../../common/events/disallowedActions/disallowedActions';
import { usePagedQuery } from '../../../../lib/api/usePagedQuery';
import { unblockUser } from '../../actions/unblockUser/unblockUser';
import { useCallingUser } from '../../hooks/useCallingUser/useCallingUser';
import { runGetMyBlockedUsersQuery } from '../../operations/runGetMyBlockedUsersQuery/runGetMyBlockedUsersQuery';
import { UserSummaryItem } from '../UserSummaryItem/UserSummaryItem';

/** People you've blocked, with Unblock. */
export function BlockedUserList() {
  const { callingUser } = useCallingUser();
  const blocks = usePagedQuery(runGetMyBlockedUsersQuery);
  const unblockCheck = canUnblockUser({ caller: callingUser });
  const [unblocking, setUnblocking] = useState<string | null>(null);

  async function unblock(block: UserBlockView) {
    const action = async () => {
      setUnblocking(block.blockedUserId);
      const result = await unblockUser({ profile: block.blockedUser });
      setUnblocking(null);
      if (result.ok) {
        blocks.remove((item) => item.blockedUserId === block.blockedUserId);
      }
    };
    if (!unblockCheck.ok) {
      disallowedActions.emit({ error: unblockCheck.error, action: () => void action() });
      return;
    }
    await action();
  }

  return (
    <IonList inset>
      <IonListHeader>Blocked</IonListHeader>
      {blocks.status === 'loading' && (
        <IonItem lines="none">
          <IonSpinner />
        </IonItem>
      )}
      {blocks.status === 'failed' && (
        <IonItem lines="none">
          <IonNote>Couldn't load who you've blocked.</IonNote>
        </IonItem>
      )}
      {blocks.status === 'ready' && blocks.items.length === 0 && (
        <IonItem lines="none">
          <IonNote>You haven't blocked anyone.</IonNote>
        </IonItem>
      )}
      {blocks.items.map((block) => (
        <UserSummaryItem key={block.blockedUserId} user={block.blockedUser}>
          <IonButton
            slot="end"
            size="small"
            fill="outline"
            disabled={unblocking === block.blockedUserId}
            onClick={() => void unblock(block)}
          >
            Unblock
          </IonButton>
        </UserSummaryItem>
      ))}
      {blocks.hasMore && (
        <IonItem button detail={false} lines="none" disabled={blocks.isLoadingMore} onClick={() => void blocks.loadMore()}>
          Show more
        </IonItem>
      )}
    </IonList>
  );
}

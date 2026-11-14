import { IonButton, IonItem, IonList, IonListHeader, IonNote, IonSpinner } from '@ionic/react';
import { canAcceptFollowRequest, canDenyFollowRequest, type UserFollowView } from '@myapp/shared/domains';
import { useState } from 'react';
import { disallowedActions } from '../../../../common/events/disallowedActions/disallowedActions';
import { usePagedQuery } from '../../../../lib/api/usePagedQuery';
import { acceptFollowRequest } from '../../actions/acceptFollowRequest/acceptFollowRequest';
import { denyFollowRequest } from '../../actions/denyFollowRequest/denyFollowRequest';
import { useCallingUser } from '../../hooks/useCallingUser/useCallingUser';
import { runGetMyFollowRequestsQuery } from '../../operations/runGetMyFollowRequestsQuery/runGetMyFollowRequestsQuery';
import { UserSummaryItem } from '../UserSummaryItem/UserSummaryItem';

/** People asking to follow you, with Accept and Deny. A request leaves the list once answered. */
export function FollowRequestList() {
  const { callingUser } = useCallingUser();
  const requests = usePagedQuery(runGetMyFollowRequestsQuery);
  const acceptCheck = canAcceptFollowRequest({ caller: callingUser });
  const denyCheck = canDenyFollowRequest({ caller: callingUser });
  const [answering, setAnswering] = useState<string | null>(null);

  async function answer(request: UserFollowView, response: 'accept' | 'deny') {
    const check = response === 'accept' ? acceptCheck : denyCheck;
    const action = async () => {
      setAnswering(request.followerId);
      const send = response === 'accept' ? acceptFollowRequest : denyFollowRequest;
      const result = await send({ follower: request.follower });
      setAnswering(null);
      if (result.ok) {
        requests.remove((item) => item.followerId === request.followerId);
      }
    };
    if (!check.ok) {
      disallowedActions.emit({ error: check.error, action: () => void action() });
      return;
    }
    await action();
  }

  return (
    <IonList inset>
      <IonListHeader>Follow requests</IonListHeader>
      {requests.status === 'loading' && (
        <IonItem lines="none">
          <IonSpinner />
        </IonItem>
      )}
      {requests.status === 'failed' && (
        <IonItem lines="none">
          <IonNote>Couldn't load your follow requests.</IonNote>
        </IonItem>
      )}
      {requests.status === 'ready' && requests.items.length === 0 && (
        <IonItem lines="none">
          <IonNote>No one's waiting. Requests show here when your account is private.</IonNote>
        </IonItem>
      )}
      {requests.items.map((request) => (
        <UserSummaryItem key={request.followerId} user={request.follower}>
          <IonButton
            slot="end"
            size="small"
            disabled={answering === request.followerId}
            onClick={() => void answer(request, 'accept')}
          >
            Accept
          </IonButton>
          <IonButton
            slot="end"
            size="small"
            fill="outline"
            disabled={answering === request.followerId}
            onClick={() => void answer(request, 'deny')}
          >
            Deny
          </IonButton>
        </UserSummaryItem>
      ))}
      {requests.hasMore && (
        <IonItem button detail={false} lines="none" disabled={requests.isLoadingMore} onClick={() => void requests.loadMore()}>
          Show more
        </IonItem>
      )}
    </IonList>
  );
}

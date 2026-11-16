import { IonItem, IonLabel } from '@ionic/react';
import type { UserProfileSummary } from '@myapp/shared/domains';
import { UserAvatar } from '../UserAvatar/UserAvatar';

/** A person to pick (e.g. to message): avatar, username, and their name under it when they gave one. */
export function UserPickerItem({ user, onSelect }: { user: UserProfileSummary; onSelect: (user: UserProfileSummary) => void }) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return (
    <IonItem button detail={false} onClick={() => onSelect(user)} data-username={user.username}>
      <UserAvatar slot="start" user={user} size={40} />
      <IonLabel>
        <h3>{user.username}</h3>
        {name && <p>{name}</p>}
      </IonLabel>
    </IonItem>
  );
}

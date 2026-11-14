import { IonItem, IonLabel } from '@ionic/react';
import type { UserProfileSummary } from '@myapp/shared/domains';
import type { MouseEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { displayName } from '../../../../utils/formatters/names';
import { UserAvatar } from '../UserAvatar/UserAvatar';
import './UserSummaryItem.css';

/** A person in a list: avatar, name and @username (links to their profile), with buttons at the end. */
export function UserSummaryItem({ user, children }: { user: UserProfileSummary; children?: ReactNode }) {
  const navigate = useNavigate();
  const href = `/users/${user.username}`;
  // Without a name, the name is already @username.
  const hasName = Boolean(user.firstName || user.lastName);

  function open(event: MouseEvent) {
    event.preventDefault();
    navigate(href);
  }

  return (
    <IonItem data-username={user.username}>
      <a slot="start" href={href} className="user-summary-item__link" onClick={open} aria-hidden="true" tabIndex={-1}>
        <UserAvatar user={user} size={40} />
      </a>
      <IonLabel>
        <a href={href} className="user-summary-item__link" onClick={open}>
          <h3>{displayName(user)}</h3>
          {hasName && <p>@{user.username}</p>}
        </a>
      </IonLabel>
      {children}
    </IonItem>
  );
}

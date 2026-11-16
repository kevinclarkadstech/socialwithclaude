import { IonItem, IonLabel } from '@ionic/react';
import type { UserProfileSummary } from '@myapp/shared/domains';
import type { MouseEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { UserAvatar } from '../UserAvatar/UserAvatar';
import './UserSummaryItem.css';

/**
 * A person in a list: avatar, username, and their name under it when they
 * gave one (links to their profile), with buttons at the end. Username
 * first, as everywhere people are listed.
 */
export function UserSummaryItem({ user, children }: { user: UserProfileSummary; children?: ReactNode }) {
  const navigate = useNavigate();
  const href = `/profile/${user.username}`;
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ');

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
          <h3>{user.username}</h3>
          {name && <p>{name}</p>}
        </a>
      </IonLabel>
      {children}
    </IonItem>
  );
}

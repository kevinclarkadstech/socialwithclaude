import { IonBadge, IonButton, IonIcon } from '@ionic/react';
import { canReadMyNotifications } from '@myapp/shared/domains';
import { notificationsOutline } from 'ionicons/icons';
import { useNavigate } from 'react-router';
import { useCallingUser } from '../../../users';
import { useUnreadNotificationCount } from '../../hooks/useUnreadNotificationCount/useUnreadNotificationCount';
import './NotificationsButton.css';

/** The header's bell: opens Notifications, with how many you haven't seen. Only once you've signed up. */
export function NotificationsButton() {
  const { callingUser } = useCallingUser();
  const navigate = useNavigate();
  const count = useUnreadNotificationCount();
  if (!canReadMyNotifications({ caller: callingUser }).ok) {
    return null;
  }
  const label = count > 0 ? `Notifications, ${count} new` : 'Notifications';
  return (
    <IonButton className="notifications-button" onClick={() => navigate('/notifications')}>
      <IonIcon slot="icon-only" icon={notificationsOutline} aria-hidden="true" />
      {count > 0 && (
        <IonBadge color="danger" className="notifications-button__badge" aria-hidden="true">
          {count > 99 ? '99+' : count}
        </IonBadge>
      )}
      <span className="visually-hidden">{label}</span>
    </IonButton>
  );
}

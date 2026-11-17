import { IonButton, IonIcon, IonItem, IonLabel, IonList, IonNote, IonSpinner } from '@ionic/react';
import type { Notification } from '@myapp/shared/domains';
import { flagOutline, warningOutline } from 'ionicons/icons';
import { useEffect, useRef } from 'react';
import { usePagedQuery } from '../../../../lib/api/usePagedQuery';
import { timeAgo } from '../../../../utils/formatters/dates';
import { runGetMyNotificationsQuery } from '../../operations/runGetMyNotificationsQuery/runGetMyNotificationsQuery';
import { runMarkNotificationsReadMutation } from '../../operations/runMarkNotificationsReadMutation/runMarkNotificationsReadMutation';
import { unreadCountStore } from '../../unreadCountStore';
import { describeNotification } from '../../utils/describeNotification/describeNotification';
import './NotificationList.css';

const icons: Record<Notification['type'], string> = {
  warning: warningOutline,
  report_resolved: flagOutline,
};

/**
 * Your notifications, newest first. Opening it marks them all read (the
 * bell goes to 0); the ones that were new stay highlighted while you're here.
 */
export function NotificationList() {
  const notifications = usePagedQuery(runGetMyNotificationsQuery);
  const marked = useRef(false);

  useEffect(() => {
    if (notifications.status !== 'ready' || marked.current) {
      return;
    }
    marked.current = true;
    if (notifications.items.some((item) => item.readAt === null)) {
      unreadCountStore.set(0);
      void runMarkNotificationsReadMutation().catch(() => null);
    }
  }, [notifications.status, notifications.items]);

  return (
    <IonList>
      {notifications.status === 'loading' && (
        <IonItem lines="none">
          <IonSpinner />
        </IonItem>
      )}
      {notifications.status === 'failed' && (
        <IonItem lines="none">
          <IonNote>Couldn't load your notifications.</IonNote>
        </IonItem>
      )}
      {notifications.status === 'ready' && notifications.items.length === 0 && (
        <IonItem lines="none">
          <IonNote>Nothing yet. Updates on your reports and messages from our team show up here.</IonNote>
        </IonItem>
      )}
      {notifications.items.map((notification) => {
        const { title, message } = describeNotification(notification);
        const isNew = notification.readAt === null;
        return (
          <IonItem
            key={notification.id}
            className={isNew ? 'notification-item notification-item--new' : 'notification-item'}
            data-notification-type={notification.type}
          >
            <IonIcon slot="start" icon={icons[notification.type]} aria-hidden="true" color={notification.type === 'warning' ? 'warning' : 'medium'} />
            <IonLabel className="ion-text-wrap">
              <h3>
                {title}
                {isNew && <span className="visually-hidden"> (new)</span>}
              </h3>
              <p>{message}</p>
              <p className="notification-item__time">
                <time dateTime={notification.createdAt}>{timeAgo(notification.createdAt)}</time>
              </p>
            </IonLabel>
          </IonItem>
        );
      })}
      {notifications.hasMore && (
        <IonItem lines="none">
          <IonButton fill="clear" disabled={notifications.isLoadingMore} onClick={() => void notifications.loadMore()}>
            Load more
          </IonButton>
        </IonItem>
      )}
    </IonList>
  );
}

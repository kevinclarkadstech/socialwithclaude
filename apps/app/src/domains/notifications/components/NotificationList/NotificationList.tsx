import { IonButton, IonIcon, IonItem, IonLabel, IonList, IonNote, IonSpinner } from '@ionic/react';
import { describeNotification, type NotificationView } from '@myapp/shared/domains';
import { flagOutline, warningOutline } from 'ionicons/icons';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { usePagedQuery } from '../../../../lib/api/usePagedQuery';
import { timeAgo } from '../../../../utils/formatters/dates';
import { commentPhotoThumbnailUrl } from '../../../posts';
import { UserAvatar } from '../../../users';
import { runGetMyNotificationsQuery } from '../../operations/runGetMyNotificationsQuery/runGetMyNotificationsQuery';
import { runMarkNotificationsReadMutation } from '../../operations/runMarkNotificationsReadMutation/runMarkNotificationsReadMutation';
import { unreadCountStore } from '../../unreadCountStore';
import './NotificationList.css';

/** The icon for the app's own notifications; people's show their avatar. */
function TypeIcon({ notification }: { notification: NotificationView }) {
  if (notification.actor) {
    return <UserAvatar slot="start" user={notification.actor} size={40} />;
  }
  const isWarning = notification.type === 'warning';
  return <IonIcon slot="start" icon={isWarning ? warningOutline : flagOutline} aria-hidden="true" color={isWarning ? 'warning' : 'medium'} />;
}

/**
 * Your notifications, newest first: who did what (tap to open it), and
 * messages from the team. Opening it marks them all read (the bell goes to
 * 0); the ones that were new stay highlighted while you're here.
 */
export function NotificationList() {
  const navigate = useNavigate();
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
          <IonNote>Nothing yet. New followers, comments on your posts, mentions and updates from our team show up here.</IonNote>
        </IonItem>
      )}
      {notifications.items.map((notification) => {
        const { title, message, target } = describeNotification(notification);
        const isNew = notification.readAt === null;
        const fromSomeone = notification.actor !== null;
        return (
          <IonItem
            key={notification.id}
            button={target !== null}
            detail={false}
            onClick={target ? () => navigate(target) : undefined}
            className={isNew ? 'notification-item notification-item--new' : 'notification-item'}
            data-notification-type={notification.type}
          >
            <TypeIcon notification={notification} />
            <IonLabel className="ion-text-wrap">
              {fromSomeone ? (
                <p className="notification-item__line">
                  <strong>{title}</strong> {message}
                  {isNew && <span className="visually-hidden"> (new)</span>}
                </p>
              ) : (
                <>
                  <h3>
                    {title}
                    {isNew && <span className="visually-hidden"> (new)</span>}
                  </h3>
                  <p>{message}</p>
                </>
              )}
              <p className="notification-item__time">
                <time dateTime={notification.createdAt}>{timeAgo(notification.createdAt)}</time>
              </p>
            </IonLabel>
            {notification.commentPhoto && (
              <img slot="end" className="notification-item__thumbnail" src={commentPhotoThumbnailUrl(notification.commentPhoto)} alt="" loading="lazy" />
            )}
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

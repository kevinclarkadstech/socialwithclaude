import { IonButtons, IonHeader, IonToolbar } from '@ionic/react';
import type { ReactNode } from 'react';
import { NotificationsButton } from '../../../domains/notifications';
import { AccountButton } from '../../../domains/users';
import { AppLogo } from '../AppLogo/AppLogo';

/**
 * The global header on each tab's home page (Feed, Marketplace, Chats): the
 * logo, then the tab's own buttons (`actions`, e.g. search), the bell and
 * your avatar. `children` are more toolbars under it (e.g. Marketplace's
 * filter). Pages opened from a tab keep their own header with Back.
 */
export function AppHeader({ actions, children }: { actions?: ReactNode; children?: ReactNode }) {
  return (
    <IonHeader>
      <IonToolbar>
        <div slot="start">
          <AppLogo />
        </div>
        <IonButtons slot="end">
          {actions}
          <NotificationsButton />
          <AccountButton />
        </IonButtons>
      </IonToolbar>
      {children}
    </IonHeader>
  );
}

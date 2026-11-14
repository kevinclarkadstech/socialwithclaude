import { IonContent, IonIcon, IonItem, IonLabel, IonList, IonMenu } from '@ionic/react';
import { logInOutline, personCircleOutline } from 'ionicons/icons';
import { useLocation } from 'react-router';
import { requireCallerWithProfile } from '@myapp/shared/authorization';
import { disallowedActions } from '../../common/events/disallowedActions/disallowedActions';
import { useCallingUser } from '../../domains/users';
import { useTabNavigation } from '../../navigation';
import './Sidebar.css';

/** On wide screens, the tabs move here (the tab bar hides). It's the same list. */
export function Sidebar({ contentId }: { contentId: string }) {
  const { tabs, activeTab, onRootRoute, switchTab } = useTabNavigation();
  const { callingUser } = useCallingUser();
  // Signed in with a profile; otherwise its error opens sign-in or onboarding.
  const signedUpCheck = requireCallerWithProfile({ caller: callingUser });
  const { pathname } = useLocation();
  // Your profile opens in the tab you're in, like any other profile.
  const activeTabPath = tabs.find((tab) => tab.id === activeTab)?.path ?? tabs[0].path;
  const profilePath = signedUpCheck.ok ? `/profile/${signedUpCheck.value.profile.username}` : null;

  return (
    // Only ever shown by the split pane; on phones the tab bar does this, so no swipe-open menu.
    <IonMenu contentId={contentId} type="overlay" swipeGesture={false} className="sidebar">
      <IonContent>
        <IonList lines="none" className="sidebar__list">
          {tabs.map((tab) => (
            <IonItem
              key={tab.id}
              button
              detail={false}
              className={!onRootRoute && tab.id === activeTab ? 'sidebar__item sidebar__item--active' : 'sidebar__item'}
              onClick={() => switchTab(tab.id)}
            >
              <IonIcon slot="start" icon={tab.icon} aria-hidden="true" />
              <IonLabel>{tab.label}</IonLabel>
            </IonItem>
          ))}

          {signedUpCheck.ok ? (
            <IonItem
              button
              detail={false}
              routerLink={`${activeTabPath}${profilePath}`}
              className={profilePath && pathname.endsWith(profilePath) ? 'sidebar__item sidebar__item--active' : 'sidebar__item'}
            >
              <IonIcon slot="start" icon={personCircleOutline} aria-hidden="true" />
              <IonLabel>Profile</IonLabel>
            </IonItem>
          ) : (
            <IonItem
              button
              detail={false}
              className="sidebar__item"
              onClick={() => disallowedActions.emit({ error: signedUpCheck.error })}
            >
              <IonIcon slot="start" icon={logInOutline} aria-hidden="true" />
              <IonLabel>{callingUser ? 'Finish sign-up' : 'Sign in'}</IonLabel>
            </IonItem>
          )}
        </IonList>
      </IonContent>
    </IonMenu>
  );
}

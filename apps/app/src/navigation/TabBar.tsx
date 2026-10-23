import { IonIcon, IonLabel, IonTabBar, IonTabButton } from '@ionic/react';
import { useTabNavigation } from './TabNavigationContext';

/**
 * The bottom tab bar. Tapping a tab shows it where it was left; tapping the
 * active tab goes back to its root, or scrolls to the top when already there.
 */
export function TabBar() {
  const { tabs, activeTab, stacks, switchTab } = useTabNavigation();

  const onTabClick = (tabId: string) => {
    const shown = stacks[tabId].at(-1);
    const tabPath = tabs.find((tab) => tab.id === tabId)!.path;
    if (tabId === activeTab && (!shown || shown.location.pathname.replace(/\/+$/, '') === tabPath)) {
      // Native behavior: tapping the active tab at its root scrolls to the top.
      document
        .querySelector<HTMLIonContentElement>(
          `[data-tab-pane="${tabId}"] > .tab-stack-page:not(.tab-stack-page-hidden) ion-content`,
        )
        ?.scrollToTop(300);
    }
    switchTab(tabId);
  };

  return (
    <IonTabBar slot="bottom" selectedTab={activeTab}>
      {tabs.map((tab) => (
        <IonTabButton key={tab.id} tab={tab.id} href={tab.path} onClick={() => onTabClick(tab.id)}>
          <IonIcon aria-hidden="true" icon={tab.icon} />
          <IonLabel>{tab.label}</IonLabel>
        </IonTabButton>
      ))}
    </IonTabBar>
  );
}

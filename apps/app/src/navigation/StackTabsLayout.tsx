import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useRoutes, type Location, type RouteObject } from 'react-router';
import { getIonPageElement } from '@ionic/react';
import { useTabNavigation } from './TabNavigationContext';
import { PageContext } from './PageContext';
import { TabBar } from './TabBar';
import { tabRoutes } from './tabRoutes';
import { tabIdForPath, type StackEntry, type TabDefinition } from './stacks';
import { animationsEnabled, runPageTransition, type TransitionDirection } from './transition';
import { useSwipeBack, type SwipeBackOptions } from './useSwipeBack';
import './TabsLayout.css';

/**
 * Each tab's stack stays mounted with only its top page shown. In the native
 * app pages animate and support swipe-back; in a browser they switch
 * instantly (see transition.ts).
 */
export function StackTabsLayout() {
  const { tabs, sharedRoutes, activeTab, stacks, visitedTabs } = useTabNavigation();
  const location = useLocation();

  if (!tabIdForPath(tabs, location.pathname)) {
    return <Navigate to={tabs[0].path} replace />;
  }

  return (
    <div className="ion-page tabs-layout">
      <div className="tabs-layout-panes">
        {tabs
          .filter((tab) => visitedTabs.includes(tab.id))
          .map((tab) => (
            <TabPane
              key={tab.id}
              tab={tab}
              sharedRoutes={sharedRoutes}
              active={tab.id === activeTab}
              entries={stacks[tab.id]}
            />
          ))}
      </div>
      <TabBar />
    </div>
  );
}

interface TabPaneProps {
  tab: TabDefinition;
  sharedRoutes: RouteObject[];
  active: boolean;
  entries: StackEntry[];
}

interface PaneTransition {
  enteringId: string;
  leavingId: string;
  direction: TransitionDirection;
}

/** Works out how the top of a stack changed: a push animates forward, a pop animates back. */
function planTransition(
  prevEntries: StackEntry[],
  entries: StackEntry[],
  animate: boolean,
): { transition: PaneTransition | null; exiting: StackEntry | null } | undefined {
  const prevTop = prevEntries[prevEntries.length - 1];
  const top = entries[entries.length - 1];
  if (prevTop.id === top.id) return undefined;

  const popped = !entries.some((entry) => entry.id === prevTop.id);
  const returnedTo = prevEntries.some((entry) => entry.id === top.id);
  // Neither a push nor a pop means the top page was replaced: no animation.
  const direction: TransitionDirection | null = !popped ? 'forward' : returnedTo ? 'back' : null;
  if (!animate || !direction || !animationsEnabled()) return { transition: null, exiting: null };
  return {
    transition: { enteringId: top.id, leavingId: prevTop.id, direction },
    // A popped page stays mounted until its exit animation finishes.
    exiting: popped ? prevTop : null,
  };
}

/** One tab's stack. Every page in the stack stays mounted; only the top one is shown. */
const TabPane = memo(function TabPane({ tab, sharedRoutes, active, entries }: TabPaneProps) {
  const routes = useMemo(() => tabRoutes(tab, sharedRoutes), [tab, sharedRoutes]);

  const { goBack } = useTabNavigation();
  const paneRef = useRef<HTMLDivElement>(null);
  const [transition, setTransition] = useState<PaneTransition | null>(null);
  const [exiting, setExiting] = useState<StackEntry | null>(null);
  // Set when a swipe already animated the pop, so the resulting stack change doesn't animate again.
  const swipedBack = useRef(false);

  // Plan the transition while rendering so the leaving page is never unmounted
  // or hidden before the animation has a chance to start.
  const [prev, setPrev] = useState({ entries, active });
  if (prev.entries !== entries || prev.active !== active) {
    setPrev({ entries, active });
    // Only animate within a tab that was already showing, not on tab switches.
    const plan = planTransition(prev.entries, entries, prev.active && active && !swipedBack.current);
    if (plan) {
      setTransition(plan.transition);
      setExiting(plan.exiting);
    }
  }

  useLayoutEffect(() => {
    swipedBack.current = false;
  }, [entries]);

  const findWrapper = useCallback(
    (id: string) =>
      Array.from(paneRef.current?.children ?? []).find(
        (el): el is HTMLElement => el instanceof HTMLElement && el.dataset.stackId === id,
      ),
    [],
  );

  const swipeOptions = useRef<SwipeBackOptions>(null!);
  useLayoutEffect(() => {
    swipeOptions.current = {
      canStart: () => active && entries.length > 1 && !transition,
      getPages: () => {
        const entering = findWrapper(entries[entries.length - 2].id);
        const leaving = findWrapper(entries[entries.length - 1].id);
        return entering && leaving ? { entering, leaving } : null;
      },
      onSwipedBack: () => {
        swipedBack.current = true;
        goBack();
      },
    };
  });
  useSwipeBack(paneRef, swipeOptions);

  useLayoutEffect(() => {
    if (!transition) return;
    const enteringWrapper = findWrapper(transition.enteringId);
    const leavingWrapper = findWrapper(transition.leavingId);
    if (!paneRef.current || !enteringWrapper || !leavingWrapper) {
      setTransition(null);
      setExiting(null);
      return;
    }

    const pageTransition = runPageTransition(
      paneRef.current,
      getIonPageElement(enteringWrapper) as HTMLElement,
      getIonPageElement(leavingWrapper) as HTMLElement,
      transition.direction,
    );
    pageTransition.finished.then((completed) => {
      if (!completed) return;
      leavingWrapper.classList.add('tab-stack-page-hidden');
      pageTransition.cleanUp();
      setTransition(null);
      setExiting(null);
    });
    // Runs when the transition finishes or a newer navigation interrupts it.
    return pageTransition.cleanUp;
  }, [transition, findWrapper]);

  const rendered = exiting && !entries.some((entry) => entry.id === exiting.id) ? [...entries, exiting] : entries;

  return (
    <div ref={paneRef} data-tab-pane={tab.id} className={active ? 'tab-pane' : 'tab-pane tab-pane-hidden'}>
      {rendered.map((entry, index) => {
        const isTop = index === entries.length - 1;
        return (
          <StackPage
            key={entry.id}
            id={entry.id}
            routes={routes}
            location={entry.location}
            tabId={tab.id}
            tabPath={tab.path}
            shown={isTop || entry.id === transition?.leavingId}
            isVisible={active && isTop}
            canGoBack={index > 0}
          />
        );
      })}
    </div>
  );
});

interface StackPageProps {
  id: string;
  routes: RouteObject[];
  location: Location;
  tabId: string;
  tabPath: string;
  /** Whether the page is displayed: the top page, or the page leaving during a transition. */
  shown: boolean;
  isVisible: boolean;
  canGoBack: boolean;
}

const StackPage = memo(function StackPage({
  id,
  routes,
  location,
  tabId,
  tabPath,
  shown,
  isVisible,
  canGoBack,
}: StackPageProps) {
  // Each page matches against its own frozen location, so useParams/useLocation
  // inside a page keep returning that page's values while it sits under the top.
  const element = useRoutes(routes, location);
  const context = useMemo(
    () => ({ tabId, tabPath, isVisible, canGoBack }),
    [tabId, tabPath, isVisible, canGoBack],
  );

  return (
    <PageContext.Provider value={context}>
      <div
        data-stack-id={id}
        className={shown ? 'tab-stack-page' : 'tab-stack-page tab-stack-page-hidden'}
        aria-hidden={!isVisible}
      >
        {element}
      </div>
    </PageContext.Provider>
  );
});

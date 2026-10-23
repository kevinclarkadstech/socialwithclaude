import { memo, useMemo, useState } from 'react';
import { Navigate, useLocation, useRoutes, type Location, type RouteObject } from 'react-router';
import { useTabNavigation } from './TabNavigationContext';
import { PageContext } from './PageContext';
import { TabBar } from './TabBar';
import { tabRoutes } from './tabRoutes';
import { normalize, tabIdForPath, type StackEntry, type TabDefinition } from './stacks';
import './TabsLayout.css';

/**
 * Browser tab layout: each visited tab stays mounted and shows the page for
 * its current URL; its other recent pages stay mounted but hidden. No page
 * transitions or swipe-back (browsers have their own back gestures). Native
 * apps use StackTabsLayout.
 */
export function WebTabsLayout() {
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
            <WebTabPane
              key={tab.id}
              tab={tab}
              sharedRoutes={sharedRoutes}
              active={tab.id === activeTab}
              pages={stacks[tab.id]}
            />
          ))}
      </div>
      <TabBar />
    </div>
  );
}

interface WebTabPaneProps {
  tab: TabDefinition;
  sharedRoutes: RouteObject[];
  active: boolean;
  /** The tab's mounted pages, the shown one last. */
  pages: StackEntry[];
}

/** Ids of `pages` in the order they were first rendered (new ones appended, gone ones dropped). */
function stableOrder(previous: string[], pages: StackEntry[]): string[] {
  const ids = new Set(pages.map((page) => page.id));
  const kept = previous.filter((id) => ids.has(id));
  const added = pages.map((page) => page.id).filter((id) => !kept.includes(id));
  return added.length === 0 && kept.length === previous.length ? previous : [...kept, ...added];
}

const WebTabPane = memo(function WebTabPane({ tab, sharedRoutes, active, pages }: WebTabPaneProps) {
  const routes = useMemo(() => tabRoutes(tab, sharedRoutes), [tab, sharedRoutes]);
  const shownId = pages.at(-1)?.id;

  // Render pages in a fixed order, not most-recent-last: React would move a
  // re-shown page's element to the end, and moving an element in the DOM
  // resets its scroll position.
  const [order, setOrder] = useState(() => pages.map((page) => page.id));
  const nextOrder = stableOrder(order, pages);
  if (nextOrder !== order) setOrder(nextOrder);
  const byId = new Map(pages.map((page) => [page.id, page]));
  const ordered = nextOrder.map((id) => byId.get(id)!);

  return (
    <div data-tab-pane={tab.id} className={active ? 'tab-pane' : 'tab-pane tab-pane-hidden'}>
      {ordered.map((page) => (
        <WebPage
          key={page.id}
          id={page.id}
          routes={routes}
          location={page.location}
          tabId={tab.id}
          tabPath={tab.path}
          shown={page.id === shownId}
          isVisible={active && page.id === shownId}
          // Any page below the tab's root has somewhere to go back to.
          canGoBack={normalize(page.location.pathname) !== tab.path}
        />
      ))}
    </div>
  );
});

interface WebPageProps {
  id: string;
  routes: RouteObject[];
  location: Location;
  tabId: string;
  tabPath: string;
  shown: boolean;
  isVisible: boolean;
  canGoBack: boolean;
}

const WebPage = memo(function WebPage({
  id,
  routes,
  location,
  tabId,
  tabPath,
  shown,
  isVisible,
  canGoBack,
}: WebPageProps) {
  // Each page matches its own location, so a hidden page keeps its params.
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

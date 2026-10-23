import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { NavigationType, useLocation, useNavigate, useNavigationType, type Location, type RouteObject } from 'react-router';
import { NavContext, type NavContextState, type RouterDirection } from '@ionic/react';
import { hrefOf, normalize, tabIdForPath, type StackEntry, type TabDefinition } from './stacks';
import {
  TabNavigationContext,
  type TabNavigationContextValue,
  type TabNavigationProviderProps as Props,
} from './TabNavigationContext';

const NO_ROUTES: RouteObject[] = [];

/** Pages each tab keeps mounted (so going back to one keeps its scroll and state). */
const MAX_PAGES_PER_TAB = 10;

interface WebNavState {
  activeTab: string;
  /** Per tab, recently shown pages by URL, the shown one last. */
  pages: Record<string, StackEntry[]>;
  visitedTabs: string[];
}

/** One page per pathname + search: the same URL shows the same page. */
const pageKey = (location: Location) => location.pathname.replace(/\/+$/, '') + location.search;

/** Shows `location` in its tab, reusing that URL's page if the tab still has it. Pure. */
function applyWebLocation(state: WebNavState, tabs: TabDefinition[], location: Location): WebNavState {
  const tabId = tabIdForPath(tabs, location.pathname);
  if (!tabId) return state;

  const pages = state.pages[tabId];
  const existing = pages.find((page) => pageKey(page.location) === pageKey(location));
  const shown: StackEntry = { id: existing?.id ?? location.key, location };
  return {
    activeTab: tabId,
    pages: {
      ...state.pages,
      [tabId]: [...pages.filter((page) => page.id !== shown.id), shown].slice(-MAX_PAGES_PER_TAB),
    },
    visitedTabs: state.visitedTabs.includes(tabId) ? state.visitedTabs : [...state.visitedTabs, tabId],
  };
}

function createInitialWebState(tabs: TabDefinition[], location: Location): WebNavState {
  const empty: WebNavState = {
    activeTab: tabs[0].id,
    pages: Object.fromEntries(tabs.map((tab) => [tab.id, []])),
    visitedTabs: [],
  };
  return applyWebLocation(empty, tabs, location);
}

/**
 * Browser tab navigation: the URL is the only state, so the browser's back
 * and forward buttons, reloads and links all just work. Each tab shows the
 * page for its current URL (no back stack, transitions or swipe-back), and
 * keeps its recently shown pages mounted so returning to one keeps its scroll.
 * Native apps use StackTabNavigationProvider instead (see index.ts).
 */
export function WebTabNavigationProvider({ tabs, sharedRoutes = NO_ROUTES, children }: Props) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const navigate = useNavigate();

  // Derived from location changes during render, like the stack version, so
  // the committed UI never shows a location the pages don't know about yet.
  const [storedState, setStoredState] = useState(() => createInitialWebState(tabs, location));
  const [seenKey, setSeenKey] = useState(location.key);
  let state = storedState;
  if (location.key !== seenKey) {
    state = applyWebLocation(storedState, tabs, location);
    setSeenKey(location.key);
    setStoredState(state);
  }

  // Mirror of this session's browser history, so the in-app back button can
  // use a real history.back() when the previous entry is in the same tab.
  const history = useRef<{ entries: { key: string; href: string; tabId?: string }[]; index: number }>({
    entries: [{ key: location.key, href: hrefOf(location), tabId: tabIdForPath(tabs, location.pathname) }],
    index: 0,
  });
  useEffect(() => {
    const h = history.current;
    const entry = { key: location.key, href: hrefOf(location), tabId: tabIdForPath(tabs, location.pathname) };
    if (navigationType === NavigationType.Push) {
      h.entries = [...h.entries.slice(0, h.index + 1), entry];
      h.index = h.entries.length - 1;
    } else if (navigationType === NavigationType.Replace) {
      h.entries[h.index] = entry;
    } else {
      const index = h.entries.findIndex((e) => e.key === location.key);
      if (index >= 0) {
        h.index = index;
      } else {
        h.entries = [entry];
        h.index = 0;
      }
    }
  }, [location, navigationType, tabs]);

  const activeTabDef = tabs.find((tab) => tab.id === state.activeTab)!;
  const shownPage = state.pages[state.activeTab].at(-1);
  const canGoBack = !!shownPage && normalize(shownPage.location.pathname) !== activeTabDef.path;

  /** Back within the tab: history.back() if that stays in the tab, else up to the tab's root. */
  const goBack = useCallback(() => {
    if (!canGoBack) return;
    const h = history.current;
    const previous = h.entries[h.index - 1];
    if (previous?.tabId === state.activeTab) navigate(-1);
    else navigate(activeTabDef.path, { replace: true });
  }, [canGoBack, state.activeTab, activeTabDef, navigate]);

  const switchTab = useCallback(
    (tabId: string) => {
      const tab = tabs.find((t) => t.id === tabId)!;
      const shown = state.pages[tabId].at(-1);
      if (tabId === state.activeTab) {
        // Tapping the active tab goes to its root (a normal link on the web).
        if (shown && normalize(shown.location.pathname) !== tab.path) navigate(tab.path);
      } else {
        navigate(shown ? hrefOf(shown.location) : tab.path);
      }
    },
    [tabs, state.pages, state.activeTab, navigate],
  );

  // Let Ionic components (routerLink, IonTabBar) navigate through React Router
  // instead of Ionic's default, which would reload the page.
  const parentNavContext = useContext(NavContext);
  const navContext = useMemo<NavContextState>(
    () => ({
      ...parentNavContext,
      routeInfo: { id: location.key, pathname: location.pathname, search: location.search },
      setCurrentTab: () => undefined,
      changeTab: () => undefined,
      resetTab: () => undefined,
      goBack,
      navigate: (path: string, direction?: RouterDirection | 'none') => {
        const h = history.current;
        if (direction === 'back' && h.entries[h.index - 1]?.href === path) navigate(-1);
        else navigate(path);
      },
    }),
    [parentNavContext, location.key, location.pathname, location.search, goBack, navigate],
  );

  const value = useMemo<TabNavigationContextValue>(
    () => ({
      tabs,
      sharedRoutes,
      activeTab: state.activeTab,
      stacks: state.pages,
      visitedTabs: state.visitedTabs,
      canGoBack,
      goBack,
      switchTab,
    }),
    [tabs, sharedRoutes, state, canGoBack, goBack, switchTab],
  );

  return (
    <TabNavigationContext.Provider value={value}>
      <NavContext.Provider value={navContext}>{children}</NavContext.Provider>
    </TabNavigationContext.Provider>
  );
}

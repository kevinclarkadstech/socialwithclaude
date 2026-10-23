import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useNavigationType, NavigationType, type RouteObject } from 'react-router';
import { NavContext, type BackButtonEvent, type NavContextState, type RouterDirection } from '@ionic/react';
import { applyLocation, createInitialState, hrefOf, withIntent } from './stacks';
import {
  TabNavigationContext,
  type TabNavigationContextValue,
  type TabNavigationProviderProps as Props,
} from './TabNavigationContext';

const NO_ROUTES: RouteObject[] = [];

/**
 * Native tab navigation: each tab keeps a stack of pages, like a native app.
 * Used on iOS and Android (see index.ts); browsers use WebTabNavigationProvider.
 */
export function StackTabNavigationProvider({ tabs, sharedRoutes = NO_ROUTES, children }: Props) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const navigate = useNavigate();

  // Stacks are derived from router location changes during render so the
  // committed UI never shows a location that the stacks don't know about yet.
  const [storedState, setStoredState] = useState(() => createInitialState(tabs, location));
  const [seenKey, setSeenKey] = useState(location.key);
  let state = storedState;
  if (location.key !== seenKey) {
    state = applyLocation(storedState, tabs, location, navigationType);
    setSeenKey(location.key);
    setStoredState(state);
  }

  // Mirror of the browser history (keys only) so goBack() can use a real
  // history.back() when the previous page is the previous history entry.
  const history = useRef({ keys: [location.key], index: 0 });
  useEffect(() => {
    const h = history.current;
    if (navigationType === NavigationType.Push) {
      h.keys = [...h.keys.slice(0, h.index + 1), location.key];
      h.index = h.keys.length - 1;
    } else if (navigationType === NavigationType.Replace) {
      h.keys[h.index] = location.key;
    } else {
      const index = h.keys.indexOf(location.key);
      if (index >= 0) {
        h.index = index;
      } else {
        h.keys = [location.key];
        h.index = 0;
      }
    }
  }, [location.key, navigationType]);

  const activeStack = state.stacks[state.activeTab];
  const canGoBack = activeStack.length > 1;

  const goBack = useCallback(() => {
    if (activeStack.length < 2) return;
    const target = activeStack[activeStack.length - 2];
    const h = history.current;
    if (h.keys[h.index - 1] === target.location.key) {
      navigate(-1);
    } else {
      navigate(hrefOf(target.location), {
        replace: true,
        state: withIntent({ type: 'pop', targetId: target.id }, target.location.state),
      });
    }
  }, [activeStack, navigate]);

  const switchTab = useCallback(
    (tabId: string) => {
      const stack = state.stacks[tabId];
      if (tabId === state.activeTab) {
        if (stack.length < 2) return;
        const root = tabs.find((tab) => tab.id === tabId)!;
        navigate(root.path, { replace: true, state: withIntent({ type: 'reset-tab' }, null) });
      } else {
        const top = stack[stack.length - 1];
        navigate(hrefOf(top.location), { state: withIntent({ type: 'switch-tab' }, top.location.state) });
      }
    },
    [state.stacks, state.activeTab, tabs, navigate],
  );

  // Android hardware back button: pop the active stack, otherwise let Ionic's default run.
  const goBackRef = useRef({ canGoBack, goBack });
  useEffect(() => {
    goBackRef.current = { canGoBack, goBack };
  }, [canGoBack, goBack]);
  useEffect(() => {
    const onBackButton = (event: Event) => {
      (event as BackButtonEvent).detail.register(10, (processNextHandler) => {
        if (goBackRef.current.canGoBack) goBackRef.current.goBack();
        else processNextHandler();
      });
    };
    document.addEventListener('ionBackButton', onBackButton);
    return () => document.removeEventListener('ionBackButton', onBackButton);
  }, []);

  // Let Ionic components (routerLink on IonItem/IonButton, IonTabBar's active
  // state) talk to React Router through our stacks instead of IonReactRouter.
  const parentNavContext = useContext(NavContext);
  const navContext = useMemo<NavContextState>(
    () => ({
      ...parentNavContext,
      routeInfo: { id: location.key, pathname: location.pathname, search: location.search },
      // Tab buttons call switchTab() themselves; the defaults would set window.location.
      setCurrentTab: () => undefined,
      changeTab: () => undefined,
      resetTab: () => undefined,
      goBack,
      navigate: (path: string, direction?: RouterDirection | 'none') => {
        const previous = activeStack[activeStack.length - 2];
        if (direction === 'back' && previous && hrefOf(previous.location) === path) {
          goBack();
        } else if (direction === 'root') {
          navigate(path, { replace: true, state: withIntent({ type: 'reset-tab' }, null) });
        } else {
          navigate(path);
        }
      },
    }),
    [parentNavContext, location.key, location.pathname, location.search, activeStack, goBack, navigate],
  );

  const value = useMemo<TabNavigationContextValue>(
    () => ({
      tabs,
      sharedRoutes,
      activeTab: state.activeTab,
      stacks: state.stacks,
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

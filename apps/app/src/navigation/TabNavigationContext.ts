import { createContext, useContext, type ReactNode } from 'react';
import type { RouteObject } from 'react-router';
import type { StackEntry, TabDefinition } from './stacks';

export interface TabNavigationProviderProps {
  tabs: TabDefinition[];
  /** Routes (relative paths) that can be opened in any tab, e.g. "items/:id". */
  sharedRoutes?: RouteObject[];
  /**
   * Top-level routes outside the tabs, e.g. "/me". They open as full pages
   * over the tabs, without the tab bar; the tabs stay mounted underneath.
   */
  rootRoutes?: RouteObject[];
  children: ReactNode;
}

export interface TabNavigationContextValue {
  tabs: TabDefinition[];
  sharedRoutes: RouteObject[];
  rootRoutes: RouteObject[];
  /** True when a root route (not a tab) is showing. */
  onRootRoute: boolean;
  activeTab: string;
  /** Each tab's back stack: its pages, all mounted, the shown one last. */
  stacks: Record<string, StackEntry[]>;
  visitedTabs: string[];
  /** True when there's a page to go back to: on a root route, or in a tab with more than its root page. */
  canGoBack: boolean;
  /** Leaves a root route for the tab underneath, or pops the top page off the active tab's stack. */
  goBack: () => void;
  /** Shows a tab where it was left. Tapping the active tab pops it back to its root. */
  switchTab: (tabId: string) => void;
}

export const TabNavigationContext = createContext<TabNavigationContextValue | null>(null);

export function useTabNavigation(): TabNavigationContextValue {
  const context = useContext(TabNavigationContext);
  if (!context) throw new Error('useTabNavigation must be used inside TabNavigationProvider');
  return context;
}

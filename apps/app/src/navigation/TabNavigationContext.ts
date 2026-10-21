import { createContext, useContext } from 'react';
import type { RouteObject } from 'react-router';
import type { StackEntry, TabDefinition } from './stacks';

export interface TabNavigationContextValue {
  tabs: TabDefinition[];
  sharedRoutes: RouteObject[];
  activeTab: string;
  stacks: Record<string, StackEntry[]>;
  visitedTabs: string[];
  /** True when the active tab has a page to go back to. */
  canGoBack: boolean;
  /** Pops the top page off the active tab's stack. */
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

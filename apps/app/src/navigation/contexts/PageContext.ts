import { createContext, useCallback, useContext } from 'react';

interface PageContextValue {
  tabId: string;
  /** Root path of the tab this page lives in, for building links that stay in the tab. */
  tabPath: string;
  /** True when this is the top page of the active tab. Hidden pages stay mounted. */
  isVisible: boolean;
  canGoBack: boolean;
}

export const PageContext = createContext<PageContextValue | null>(null);

export function usePageContext(): PageContextValue {
  const context = useContext(PageContext);
  if (!context) throw new Error('usePageContext must be used inside a tab page');
  return context;
}

/** Builds an absolute path inside the current page's tab: tabHref("items/1") -> "/tab1/items/1". */
export function useTabHref(): (path: string) => string {
  const { tabPath } = usePageContext();
  return useCallback((path: string) => `${tabPath}/${path.replace(/^\/+/, '')}`, [tabPath]);
}

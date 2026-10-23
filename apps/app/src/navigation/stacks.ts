import { NavigationType, type Location, type Path } from 'react-router';
import type { ReactNode } from 'react';
import type { RouteObject } from 'react-router';

export interface TabDefinition {
  id: string;
  /** Root path of the tab, e.g. "/home". Every route in the tab lives under it. */
  path: string;
  label: string;
  icon: string;
  /** Page rendered at the tab's root path. */
  element: ReactNode;
  /** Extra routes (relative to `path`) that only exist inside this tab. */
  routes?: RouteObject[];
}

export interface StackEntry {
  /** Stable id for the page instance. Survives tab switches so the page stays mounted. */
  id: string;
  location: Location;
}

export interface NavState {
  activeTab: string;
  stacks: Record<string, StackEntry[]>;
  /** Tabs that have been shown at least once. Unvisited tabs are not mounted. */
  visitedTabs: string[];
}

/**
 * Navigations made by the tab system itself carry an intent in `location.state`
 * so the reducer knows how to update the stacks. User state is kept under `state`
 * and handed back to pages untouched.
 */
const INTENT_KEY = '__tabNav';

export type NavIntent =
  | { type: 'switch-tab' }
  | { type: 'reset-tab' }
  | { type: 'pop'; targetId: string };

interface IntentState {
  [INTENT_KEY]: NavIntent;
  state: unknown;
}

function isIntentState(state: unknown): state is IntentState {
  return typeof state === 'object' && state !== null && INTENT_KEY in state;
}

export function withIntent(intent: NavIntent, state: unknown): IntentState {
  return { [INTENT_KEY]: intent, state };
}

/** Removes the intent wrapper so pages only ever see their own location state. */
function cleanLocation(location: Location): Location {
  return isIntentState(location.state) ? { ...location, state: location.state.state } : location;
}

export function hrefOf({ pathname, search, hash }: Path): string {
  return pathname + search + hash;
}

export function normalize(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}

export function tabIdForPath(tabs: TabDefinition[], pathname: string): string | undefined {
  const path = normalize(pathname);
  return tabs.find((tab) => path === tab.path || path.startsWith(`${tab.path}/`))?.id;
}

function rootEntry(tab: TabDefinition): StackEntry {
  return {
    id: `root:${tab.id}`,
    location: { pathname: tab.path, search: '', hash: '', state: null, key: `root:${tab.id}` },
  };
}

function findLastIndex<T>(items: T[], predicate: (item: T) => boolean): number {
  for (let i = items.length - 1; i >= 0; i--) {
    if (predicate(items[i])) return i;
  }
  return -1;
}

export function createInitialState(tabs: TabDefinition[], location: Location): NavState {
  const stacks = Object.fromEntries(tabs.map((tab) => [tab.id, [rootEntry(tab)]]));
  const tabId = tabIdForPath(tabs, location.pathname);
  if (!tabId) return { activeTab: tabs[0].id, stacks, visitedTabs: [] };

  // Deep link: seed the tab root underneath so "back" has somewhere to go.
  const tab = tabs.find((t) => t.id === tabId)!;
  const loc = cleanLocation(location);
  const entry = { id: loc.key, location: loc };
  stacks[tabId] =
    normalize(loc.pathname) === tab.path ? [{ ...entry, id: rootEntry(tab).id }] : [rootEntry(tab), entry];

  return { activeTab: tabId, stacks, visitedTabs: [tabId] };
}

/** Folds a router location change into the per-tab stacks. Pure. */
export function applyLocation(
  state: NavState,
  tabs: TabDefinition[],
  location: Location,
  navigationType: NavigationType,
): NavState {
  const tabId = tabIdForPath(tabs, location.pathname);
  if (!tabId) return state;

  // History POPs (browser back/forward) re-visit old entries whose intent was already applied.
  const intent =
    navigationType !== NavigationType.Pop && isIntentState(location.state)
      ? location.state[INTENT_KEY]
      : undefined;
  const loc = cleanLocation(location);
  const stack = state.stacks[tabId];
  const top = stack[stack.length - 1];
  const truncateTo = (index: number) => [...stack.slice(0, index), { id: stack[index].id, location: loc }];

  let next: StackEntry[];
  if (intent?.type === 'switch-tab') {
    next = truncateTo(stack.length - 1);
  } else if (intent?.type === 'reset-tab') {
    next = truncateTo(0);
  } else if (intent?.type === 'pop') {
    const index = stack.findIndex((entry) => entry.id === intent.targetId);
    next = index >= 0 ? truncateTo(index) : [...stack, { id: loc.key, location: loc }];
  } else if (navigationType === NavigationType.Pop) {
    let index = findLastIndex(stack, (entry) => entry.location.key === loc.key);
    if (index < 0) index = findLastIndex(stack, (entry) => hrefOf(entry.location) === hrefOf(loc));
    next = index >= 0 ? truncateTo(index) : [...stack, { id: loc.key, location: loc }];
  } else if (navigationType === NavigationType.Replace) {
    // Same pathname (e.g. search param updates) keeps the page mounted; a new path is a new page.
    const id = top.location.pathname === loc.pathname ? top.id : loc.key;
    next = [...stack.slice(0, -1), { id, location: loc }];
  } else {
    next = [...stack, { id: loc.key, location: loc }];
  }

  return {
    activeTab: tabId,
    stacks: { ...state.stacks, [tabId]: next },
    visitedTabs: state.visitedTabs.includes(tabId) ? state.visitedTabs : [...state.visitedTabs, tabId],
  };
}

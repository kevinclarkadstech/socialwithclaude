import type { ReactNode } from 'react';
import type { RouteObject, Location } from 'react-router';

export type NavIntent =
    | { type: 'switch-tab' }
    | { type: 'reset-tab' }
    | { type: 'pop'; targetId: string };


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
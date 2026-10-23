import { Navigate, type RouteObject } from 'react-router';
import type { TabDefinition } from './stacks';

/** The routes of one tab: its root page, its own routes, the shared ones, and a fallback to its root. */
export function tabRoutes(tab: TabDefinition, sharedRoutes: RouteObject[]): RouteObject[] {
  return [
    {
      path: tab.path.replace(/^\/+/, ''),
      children: [
        { index: true, element: tab.element },
        ...(tab.routes ?? []),
        ...sharedRoutes,
        { path: '*', element: <Navigate to={tab.path} replace /> },
      ],
    },
  ];
}

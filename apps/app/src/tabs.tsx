import { chatbubblesOutline, newspaperOutline, storefrontOutline } from 'ionicons/icons';
import type { RouteObject } from 'react-router';
import type { TabDefinition } from './navigation';
import ChatsPage from './pages/ChatsPage';
import FeedPage from './pages/FeedPage';
import MarketplacePage from './pages/MarketplacePage';
import ProfilePage from './pages/ProfilePage';

/**
 * The app's main sections. The bottom tab bar shows them on phones; the same
 * list will drive a sidebar on wide screens.
 */
export const tabs: TabDefinition[] = [
  { id: 'feed', path: '/feed', label: 'Feed', icon: newspaperOutline, element: <FeedPage /> },
  { id: 'marketplace', path: '/marketplace', label: 'Marketplace', icon: storefrontOutline, element: <MarketplacePage /> },
  { id: 'chats', path: '/chats', label: 'Chats', icon: chatbubblesOutline, element: <ChatsPage /> },
];

/** Pages that open on top of whichever tab you're in, e.g. /feed/me or /chats/me. */
export const sharedRoutes: RouteObject[] = [{ path: 'me', element: <ProfilePage /> }];

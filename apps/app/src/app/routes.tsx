import { chatbubblesOutline, newspaperOutline, storefrontOutline } from 'ionicons/icons';
import type { RouteObject } from 'react-router';
import ChatsPage from '../features/chats/ChatsPage';
import FeedPage from '../features/feed/FeedPage';
import MarketplacePage from '../features/marketplace/MarketplacePage';
import ProfilePage from '../features/profile/ProfilePage';
import type { TabDefinition } from '../navigation';

/** The app's main sections: the bottom tab bar on phones, the sidebar on wide screens. */
export const tabs: TabDefinition[] = [
  { id: 'feed', path: '/feed', label: 'Feed', icon: newspaperOutline, element: <FeedPage /> },
  { id: 'marketplace', path: '/marketplace', label: 'Marketplace', icon: storefrontOutline, element: <MarketplacePage /> },
  { id: 'chats', path: '/chats', label: 'Chats', icon: chatbubblesOutline, element: <ChatsPage /> },
];

/** Top-level pages outside the tabs. They open over the tabs, without the tab bar. */
export const rootRoutes: RouteObject[] = [{ path: '/me', element: <ProfilePage /> }];

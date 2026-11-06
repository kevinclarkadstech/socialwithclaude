import { chatbubblesOutline, newspaperOutline, storefrontOutline } from 'ionicons/icons';
import type { RouteObject } from 'react-router';
import ChatsPage from '../features/chats/ChatsPage';
import FeedPage from '../features/posts/FeedPage';
import PostPage from '../features/posts/PostPage';
import MarketplacePage from '../features/marketplace/MarketplacePage';
import ProfilePage from '../features/profile/ProfilePage';
import type { TabDefinition } from '../navigation';

/** The app's main sections: the bottom tab bar on phones, the sidebar on wide screens. */
export const tabs: TabDefinition[] = [
  { id: 'feed', path: '/feed', label: 'Feed', icon: newspaperOutline, element: <FeedPage /> },
  { id: 'marketplace', path: '/marketplace', label: 'Marketplace', icon: storefrontOutline, element: <MarketplacePage /> },
  { id: 'chats', path: '/chats', label: 'Chats', icon: chatbubblesOutline, element: <ChatsPage /> },
];

/** Pages that open on top of whichever tab you're in, e.g. /feed/posts/123. */
export const sharedRoutes: RouteObject[] = [{ path: 'posts/:postId', element: <PostPage /> }];

/** Top-level pages outside the tabs. They open over the tabs, without the tab bar. */
export const rootRoutes: RouteObject[] = [{ path: '/me', element: <ProfilePage /> }];

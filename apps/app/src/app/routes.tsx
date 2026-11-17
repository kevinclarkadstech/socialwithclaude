import { chatbubblesOutline, newspaperOutline, storefrontOutline } from 'ionicons/icons';
import type { RouteObject } from 'react-router';
import { ChatPage } from '../pages/ChatPage/ChatPage';
import { ChatsPage } from '../pages/ChatsPage/ChatsPage';
import { ChatsSearchPage } from '../pages/ChatsSearchPage/ChatsSearchPage';
import { FeedPage } from '../pages/FeedPage/FeedPage';
import { FeedSearchPage } from '../pages/FeedSearchPage/FeedSearchPage';
import { NewChatPage } from '../pages/NewChatPage/NewChatPage';
import { PostDetailPage } from '../pages/PostDetailPage/PostDetailPage';
import { SettingsPage } from '../pages/SettingsPage/SettingsPage';
import { ModerationRoute } from '../pages/ModerationPage/ModerationRoute';
import { MarketplacePage } from '../pages/MarketplacePage/MarketplacePage';
import { MarketplaceSearchPage } from '../pages/MarketplaceSearchPage/MarketplaceSearchPage';
import { UserProfilePage } from '../pages/UserProfilePage/UserProfilePage';
import type { TabDefinition } from '../navigation';

/** The app's main sections: the bottom tab bar on phones, the sidebar on wide screens. */
export const tabs: TabDefinition[] = [
  // Each tab's search is its own page in that tab (e.g. /feed/search), searching only what the tab shows.
  { id: 'feed', path: '/feed', label: 'Feed', icon: newspaperOutline, element: <FeedPage />, routes: [{ path: 'search', element: <FeedSearchPage /> }] },
  {
    id: 'marketplace',
    path: '/marketplace',
    label: 'Marketplace',
    icon: storefrontOutline,
    element: <MarketplacePage />,
    routes: [{ path: 'search', element: <MarketplaceSearchPage /> }],
  },
  {
    id: 'chats',
    path: '/chats',
    label: 'Chats',
    icon: chatbubblesOutline,
    element: <ChatsPage />,
    routes: [
      { path: 'search', element: <ChatsSearchPage /> },
      { path: 'new', element: <NewChatPage /> },
      { path: ':chatId', element: <ChatPage /> },
    ],
  },
];

/** Pages that open on top of whichever tab you're in, e.g. /feed/posts/123. */
export const sharedRoutes: RouteObject[] = [
  { path: 'posts/:postId', element: <PostDetailPage /> },
  { path: 'profile/:username', element: <UserProfilePage /> },
];


/** Top-level pages outside the tabs. They open over the tabs, without the tab bar. */
export const rootRoutes: RouteObject[] = [
  { path: '/settings', element: <SettingsPage /> },
  // Admins only; loaded on demand.
  { path: '/moderation', element: <ModerationRoute /> },
  // Your profile (from the account button) and shared links: a full page over the tabs.
  { path: '/profile/:username', element: <UserProfilePage /> },
];

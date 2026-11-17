/**
 * The chats domain's public API: the only things code outside domains/chats imports.
 * Inside the domain, files import each other directly.
 */

// Components
export { ChatComposer } from './components/ChatComposer/ChatComposer';
export { ChatSuggestions } from './components/ChatSuggestions/ChatSuggestions';
export { ChatListItem } from './components/ChatListItem/ChatListItem';
export { ChatMessageBubble } from './components/ChatMessageBubble/ChatMessageBubble';
export { ChatMessageSearchItem } from './components/ChatMessageSearchItem/ChatMessageSearchItem';

// Hooks
export { reportChatMessage } from './actions/reportChatMessage/reportChatMessage';

export { useChat } from './hooks/useChat/useChat';
export { useChatMessages } from './hooks/useChatMessages/useChatMessages';

// Operations
export { runClearChatMutation } from './operations/runClearChatMutation/runClearChatMutation';
export { runGetOrCreateDirectChatMutation } from './operations/runGetOrCreateDirectChatMutation/runGetOrCreateDirectChatMutation';
export { runGetMyChatsQuery } from './operations/runGetMyChatsQuery/runGetMyChatsQuery';
export { runSearchChatsQuery } from './operations/runSearchChatsQuery/runSearchChatsQuery';

// Types
export type { ShownChatMessage } from './types';

// Utils
export { chatMembers } from './utils/chatMembers/chatMembers';
export { chatPartnerName } from './utils/chatPartnerName/chatPartnerName';

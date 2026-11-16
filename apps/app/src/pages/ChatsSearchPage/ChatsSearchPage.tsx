import type { ChatMessageSearchResult } from '@myapp/shared/domains';
import { SearchPage } from '../../common/components/SearchPage/SearchPage';
import { ChatMessageSearchItem, runSearchChatsQuery } from '../../domains/chats';
import type { SearchFn } from '../../lib/api/useSearchResults';

const searchMessages: SearchFn<ChatMessageSearchResult> = ({ query, cursor }) => runSearchChatsQuery({ query, cursor });

/** The Chats tab's search: messages in your chats, newest first. */
export function ChatsSearchPage() {
  return (
    <SearchPage
      placeholder="Search messages"
      search={searchMessages}
      getKey={(result) => result.message.id}
      renderItem={(result) => <ChatMessageSearchItem result={result} />}
      hint="Find messages in your chats."
      emptyText={(query) => `No messages contain "${query}".`}
    />
  );
}
